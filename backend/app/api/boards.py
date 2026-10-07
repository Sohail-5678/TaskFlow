"""Board endpoints: CRUD + member management (RBAC)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, require_board_role
from app.db.base import get_db
from app.models.activity import ActivityLog
from app.models.board import Board, BoardMember, BoardRole
from app.models.user import User
from app.schemas.board import (
    AddMember,
    BoardCreate,
    BoardDetail,
    BoardOut,
    BoardUpdate,
    MemberOut,
    UpdateMemberRole,
)

router = APIRouter(prefix="/boards", tags=["boards"])


@router.get("", response_model=list[BoardOut])
async def list_my_boards(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Return every board the user owns or is a member of, with their role."""
    owned = (await db.execute(select(Board).where(Board.owner_id == current_user.id))).scalars().all()

    member_rows = (
        await db.execute(
            select(Board, BoardMember.role)
            .join(BoardMember, BoardMember.board_id == Board.id)
            .where(BoardMember.user_id == current_user.id)
        )
    ).all()

    out: dict[int, BoardOut] = {}
    for b in owned:
        bo = BoardOut.model_validate(b)
        bo.role = BoardRole.admin
        out[b.id] = bo
    for b, role in member_rows:
        if b.id not in out:
            bo = BoardOut.model_validate(b)
            bo.role = role
            out[b.id] = bo
    return sorted(out.values(), key=lambda x: x.created_at, reverse=True)


@router.post("", response_model=BoardOut, status_code=status.HTTP_201_CREATED)
async def create_board(
    payload: BoardCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    board = Board(name=payload.name, description=payload.description, owner_id=current_user.id)
    db.add(board)
    await db.flush()
    # The owner is also recorded as an admin member for uniform RBAC queries.
    db.add(BoardMember(board_id=board.id, user_id=current_user.id, role=BoardRole.admin))
    db.add(ActivityLog(board_id=board.id, actor_id=current_user.id, action="created the board"))
    await db.flush()
    await db.refresh(board)
    bo = BoardOut.model_validate(board)
    bo.role = BoardRole.admin
    return bo


@router.get("/{board_id}", response_model=BoardDetail)
async def get_board(
    board_id: int,
    role: BoardRole = Depends(require_board_role(BoardRole.viewer)),
    db: AsyncSession = Depends(get_db),
):
    board = (
        await db.execute(
            select(Board)
            .where(Board.id == board_id)
            .options(selectinload(Board.members).selectinload(BoardMember.user))
        )
    ).scalar_one()
    detail = BoardDetail.model_validate(board)
    detail.role = role
    detail.members = [MemberOut(user=m.user, role=m.role) for m in board.members]
    return detail


@router.patch("/{board_id}", response_model=BoardOut)
async def update_board(
    board_id: int,
    payload: BoardUpdate,
    role: BoardRole = Depends(require_board_role(BoardRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    board = await db.get(Board, board_id)
    if payload.name is not None:
        board.name = payload.name
    if payload.description is not None:
        board.description = payload.description
    await db.flush()
    await db.refresh(board)
    bo = BoardOut.model_validate(board)
    bo.role = role
    return bo


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(
    board_id: int,
    role: BoardRole = Depends(require_board_role(BoardRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    board = await db.get(Board, board_id)
    await db.delete(board)


# ---- Member management (admin only) ----

@router.post("/{board_id}/members", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
async def add_member(
    board_id: int,
    payload: AddMember,
    role: BoardRole = Depends(require_board_role(BoardRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No user with that email")

    exists = (
        await db.execute(
            select(BoardMember).where(
                BoardMember.board_id == board_id, BoardMember.user_id == user.id
            )
        )
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "User is already a member")

    member = BoardMember(board_id=board_id, user_id=user.id, role=payload.role)
    db.add(member)
    db.add(ActivityLog(board_id=board_id, actor_id=user.id, action=f"was added as {payload.role.value}"))
    await db.flush()
    return MemberOut(user=user, role=member.role)


@router.patch("/{board_id}/members/{user_id}", response_model=MemberOut)
async def update_member_role(
    board_id: int,
    user_id: int,
    payload: UpdateMemberRole,
    role: BoardRole = Depends(require_board_role(BoardRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    member = (
        await db.execute(
            select(BoardMember).where(
                BoardMember.board_id == board_id, BoardMember.user_id == user_id
            )
        )
    ).scalar_one_or_none()
    if member is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    member.role = payload.role
    await db.flush()
    user = await db.get(User, user_id)
    return MemberOut(user=user, role=member.role)


@router.delete("/{board_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    board_id: int,
    user_id: int,
    role: BoardRole = Depends(require_board_role(BoardRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    board = await db.get(Board, board_id)
    if board.owner_id == user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot remove the board owner")
    member = (
        await db.execute(
            select(BoardMember).where(
                BoardMember.board_id == board_id, BoardMember.user_id == user_id
            )
        )
    ).scalar_one_or_none()
    if member:
        await db.delete(member)
