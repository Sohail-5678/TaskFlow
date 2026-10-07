from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.board import BoardRole
from app.schemas.auth import UserOut


class BoardCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: Optional[str] = None


class BoardUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = None


class MemberOut(BaseModel):
    user: UserOut
    role: BoardRole

    class Config:
        from_attributes = True


class BoardOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    owner_id: int
    created_at: datetime
    role: Optional[BoardRole] = None  # the requesting user's role on this board

    class Config:
        from_attributes = True


class BoardDetail(BoardOut):
    members: List[MemberOut] = []


class AddMember(BaseModel):
    email: str
    role: BoardRole = BoardRole.member


class UpdateMemberRole(BaseModel):
    role: BoardRole
