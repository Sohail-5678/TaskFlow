"""Board and BoardMember models.

BoardMember is the normalized join table that also stores the member's
role on that board, which powers role-based access control (RBAC).
"""
import enum
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    Index,
    Enum as SAEnum,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class BoardRole(str, enum.Enum):
    viewer = "viewer"   # read-only
    member = "member"   # can edit tasks
    admin = "admin"     # can manage members + delete board


class Board(Base):
    __tablename__ = "boards"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    owner = relationship("User", back_populates="owned_boards")
    members = relationship("BoardMember", back_populates="board", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="board", cascade="all, delete-orphan")


class BoardMember(Base):
    __tablename__ = "board_members"
    __table_args__ = (
        # One membership row per (board, user) — enforced + fast lookups.
        UniqueConstraint("board_id", "user_id", name="uq_board_user"),
        Index("ix_board_members_board_user", "board_id", "user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int] = mapped_column(
        ForeignKey("boards.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[BoardRole] = mapped_column(
        SAEnum(BoardRole, name="board_role"), default=BoardRole.member, nullable=False
    )

    board = relationship("Board", back_populates="members")
    user = relationship("User", back_populates="memberships")
