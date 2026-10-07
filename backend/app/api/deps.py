"""Reusable FastAPI dependencies: current user + board RBAC checks."""
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.base import get_db
from app.models.board import Board, BoardMember, BoardRole
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)

# Role ranking so we can express "at least member", "at least admin", etc.
ROLE_RANK = {BoardRole.viewer: 0, BoardRole.member: 1, BoardRole.admin: 2}


async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    user_id = decode_access_token(creds.credentials)
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")
    return user


async def _role_on_board(db: AsyncSession, board_id: int, user_id: int) -> Optional[BoardRole]:
    board = await db.get(Board, board_id)
    if board is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Board not found")
    if board.owner_id == user_id:
        return BoardRole.admin  # owner always has admin rights
    result = await db.execute(
        select(BoardMember.role).where(
            BoardMember.board_id == board_id, BoardMember.user_id == user_id
        )
    )
    return result.scalar_one_or_none()


def require_board_role(minimum: BoardRole):
    """Dependency factory — ensures the user has at least `minimum` role.

    Usage:  _: BoardRole = Depends(require_board_role(BoardRole.member))
    """

    async def checker(
        board_id: int,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> BoardRole:
        role = await _role_on_board(db, board_id, current_user.id)
        if role is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not a member of this board")
        if ROLE_RANK[role] < ROLE_RANK[minimum]:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Requires '{minimum.value}' role (you have '{role.value}')",
            )
        return role

    return checker
