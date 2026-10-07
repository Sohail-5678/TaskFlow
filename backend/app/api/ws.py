"""WebSocket endpoint for real-time board updates.

Clients connect to /ws/boards/{board_id}?token=<JWT>. The token is
validated and board membership is checked before the socket joins the room.
"""
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.core.security import decode_access_token
from app.db.base import AsyncSessionLocal
from app.models.board import Board, BoardMember
from app.realtime.hub import hub

router = APIRouter()


async def _can_view(board_id: int, user_id: int) -> bool:
    async with AsyncSessionLocal() as db:
        board = await db.get(Board, board_id)
        if board is None:
            return False
        if board.owner_id == user_id:
            return True
        row = await db.execute(
            select(BoardMember).where(
                BoardMember.board_id == board_id, BoardMember.user_id == user_id
            )
        )
        return row.scalar_one_or_none() is not None


@router.websocket("/ws/boards/{board_id}")
async def board_ws(websocket: WebSocket, board_id: int, token: str = Query(default="")):
    user_id = decode_access_token(token)
    if user_id is None or not await _can_view(board_id, user_id):
        # 1008 = policy violation
        await websocket.close(code=1008)
        return

    await hub.connect(board_id, websocket)
    try:
        # Keep the connection alive; clients may send pings.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await hub.disconnect(board_id, websocket)
    except Exception:
        await hub.disconnect(board_id, websocket)
