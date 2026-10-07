"""Task endpoints: board column load, pagination, CRUD, and drag-&-drop move.

Every mutation broadcasts a typed event over WebSockets so all connected
members see the change instantly.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, require_board_role
from app.db.base import get_db
from app.models.activity import ActivityLog
from app.models.board import BoardRole
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.realtime.hub import hub
from app.schemas.task import (
    PaginatedTasks,
    TaskCreate,
    TaskMove,
    TaskOut,
    TaskUpdate,
)

router = APIRouter(prefix="/boards/{board_id}/tasks", tags=["tasks"])


async def _serialize(db: AsyncSession, task: Task) -> TaskOut:
    # Ensure the assignee relationship is loaded for the response.
    full = (
        await db.execute(
            select(Task).where(Task.id == task.id).options(selectinload(Task.assignee))
        )
    ).scalar_one()
    return TaskOut.model_validate(full)


@router.get("", response_model=dict)
async def get_board_tasks(
    board_id: int,
    role: BoardRole = Depends(require_board_role(BoardRole.viewer)),
    db: AsyncSession = Depends(get_db),
):
    """Return all tasks grouped by column, ordered by position.

    Uses the composite index (board_id, status, position) so each column
    comes back pre-sorted from a single index scan.
    """
    rows = (
        await db.execute(
            select(Task)
            .where(Task.board_id == board_id)
            .options(selectinload(Task.assignee))
            .order_by(Task.status, Task.position)
        )
    ).scalars().all()

    columns: dict[str, list] = {s.value: [] for s in TaskStatus}
    for t in rows:
        columns[t.status.value].append(TaskOut.model_validate(t))
    return {"columns": columns}


@router.get("/search", response_model=PaginatedTasks)
async def search_tasks(
    board_id: int,
    q: str | None = Query(default=None, description="Case-insensitive title search"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    role: BoardRole = Depends(require_board_role(BoardRole.viewer)),
    db: AsyncSession = Depends(get_db),
):
    """Paginated, searchable task listing (demonstrates pagination + indexing)."""
    base = select(Task).where(Task.board_id == board_id)
    if q:
        base = base.where(func.lower(Task.title).like(f"%{q.lower()}%"))

    total = (
        await db.execute(select(func.count()).select_from(base.subquery()))
    ).scalar_one()

    rows = (
        await db.execute(
            base.options(selectinload(Task.assignee))
            .order_by(Task.updated_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()

    return PaginatedTasks(
        items=[TaskOut.model_validate(t) for t in rows],
        total=total,
        page=page,
        page_size=page_size,
        has_next=(page * page_size) < total,
    )


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    board_id: int,
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
    role: BoardRole = Depends(require_board_role(BoardRole.member)),
    db: AsyncSession = Depends(get_db),
):
    # New task goes to the end of its column.
    max_pos = (
        await db.execute(
            select(func.coalesce(func.max(Task.position), -1)).where(
                Task.board_id == board_id, Task.status == payload.status
            )
        )
    ).scalar_one()

    task = Task(
        board_id=board_id,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        position=max_pos + 1,
        due_date=payload.due_date,
        assignee_id=payload.assignee_id,
    )
    db.add(task)
    db.add(ActivityLog(board_id=board_id, actor_id=current_user.id, action=f"created task '{payload.title}'"))
    await db.flush()
    out = await _serialize(db, task)
    await hub.broadcast(board_id, "task.created", out.model_dump(mode="json"))
    return out


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    board_id: int,
    task_id: int,
    payload: TaskUpdate,
    role: BoardRole = Depends(require_board_role(BoardRole.member)),
    db: AsyncSession = Depends(get_db),
):
    task = await db.get(Task, task_id)
    if task is None or task.board_id != board_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(task, field, value)
    await db.flush()
    out = await _serialize(db, task)
    await hub.broadcast(board_id, "task.updated", out.model_dump(mode="json"))
    return out


@router.post("/{task_id}/move", response_model=TaskOut)
async def move_task(
    board_id: int,
    task_id: int,
    payload: TaskMove,
    role: BoardRole = Depends(require_board_role(BoardRole.member)),
    db: AsyncSession = Depends(get_db),
):
    """Drag-&-drop move: place a task into a column at a target position.

    Shifts the positions of tasks in the destination column so ordering
    stays consistent, then broadcasts task.moved to all board members.
    """
    task = await db.get(Task, task_id)
    if task is None or task.board_id != board_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")

    dest = (
        await db.execute(
            select(Task)
            .where(Task.board_id == board_id, Task.status == payload.status, Task.id != task_id)
            .order_by(Task.position)
        )
    ).scalars().all()

    insert_at = max(0, min(payload.position, len(dest)))
    reordered = dest[:insert_at] + [task] + dest[insert_at:]
    for idx, t in enumerate(reordered):
        t.status = payload.status
        t.position = idx
    task.updated_at = datetime.now(timezone.utc)
    await db.flush()

    out = await _serialize(db, task)
    await hub.broadcast(board_id, "task.moved", out.model_dump(mode="json"))
    return out


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    board_id: int,
    task_id: int,
    role: BoardRole = Depends(require_board_role(BoardRole.member)),
    db: AsyncSession = Depends(get_db),
):
    task = await db.get(Task, task_id)
    if task is None or task.board_id != board_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    await db.delete(task)
    await db.flush()
    await hub.broadcast(board_id, "task.deleted", {"id": task_id, "board_id": board_id})
