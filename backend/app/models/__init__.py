"""Import all models so Alembic + metadata see them."""
from app.models.user import User
from app.models.board import Board, BoardMember, BoardRole
from app.models.task import Task, TaskStatus
from app.models.activity import ActivityLog

__all__ = [
    "User",
    "Board",
    "BoardMember",
    "BoardRole",
    "Task",
    "TaskStatus",
    "ActivityLog",
]
