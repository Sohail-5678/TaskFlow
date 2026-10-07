from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.task import TaskStatus
from app.schemas.auth import UserOut


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.todo
    due_date: Optional[datetime] = None
    assignee_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    assignee_id: Optional[int] = None


class TaskMove(BaseModel):
    """Move a task to a column at a given position (drag & drop)."""
    status: TaskStatus
    position: int = Field(ge=0)


class TaskOut(BaseModel):
    id: int
    board_id: int
    title: str
    description: Optional[str]
    status: TaskStatus
    position: int
    due_date: Optional[datetime]
    assignee_id: Optional[int]
    assignee: Optional[UserOut] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaginatedTasks(BaseModel):
    items: List[TaskOut]
    total: int
    page: int
    page_size: int
    has_next: bool
