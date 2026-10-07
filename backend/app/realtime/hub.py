"""In-process WebSocket connection hub for real-time board updates.

Tracks which WebSocket clients are watching which board, and broadcasts
typed events (task.created, task.moved, ...) to everyone on that board.

This is intentionally dependency-free (no Redis) so it runs at $0 on a
single Azure App Service instance, which is exactly the free-tier setup.
For multi-instance scale you would swap this for a Redis pub/sub backend;
the public broadcast() API would stay the same.
"""
import asyncio
from collections import defaultdict
from typing import Any, Dict, Set

from fastapi import WebSocket


class ConnectionHub:
    def __init__(self) -> None:
        self._rooms: Dict[int, Set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, board_id: int, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._rooms[board_id].add(ws)

    async def disconnect(self, board_id: int, ws: WebSocket) -> None:
        async with self._lock:
            self._rooms[board_id].discard(ws)
            if not self._rooms[board_id]:
                self._rooms.pop(board_id, None)

    async def broadcast(self, board_id: int, event: str, payload: Any) -> None:
        """Send a typed event to all clients watching this board."""
        message = {"event": event, "data": payload}
        dead: list[WebSocket] = []
        # Copy the set so we can mutate on failure without holding the lock.
        async with self._lock:
            targets = list(self._rooms.get(board_id, set()))
        for ws in targets:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(board_id, ws)


hub = ConnectionHub()
