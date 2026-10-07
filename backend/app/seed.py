"""Seed the database with a demo user, board, members, and tasks.

Run with:  python -m app.seed
Login:     demo@taskflow.app  /  demo1234
"""
import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.security import hash_password
from app.db.base import AsyncSessionLocal, Base, engine
from app.models.board import Board, BoardMember, BoardRole
from app.models.task import Task, TaskStatus
from app.models.user import User


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == "demo@taskflow.app"))
        if existing.scalar_one_or_none():
            print("Demo data already present. Nothing to do.")
            return

        demo = User(email="demo@taskflow.app", full_name="Demo User", hashed_password=hash_password("demo1234"))
        alex = User(email="alex@taskflow.app", full_name="Alex Rivera", hashed_password=hash_password("demo1234"))
        sam = User(email="sam@taskflow.app", full_name="Sam Lee", hashed_password=hash_password("demo1234"))
        db.add_all([demo, alex, sam])
        await db.flush()

        board = Board(name="Product Launch", description="Q3 go-to-market tasks", owner_id=demo.id)
        db.add(board)
        await db.flush()

        db.add_all([
            BoardMember(board_id=board.id, user_id=demo.id, role=BoardRole.admin),
            BoardMember(board_id=board.id, user_id=alex.id, role=BoardRole.member),
            BoardMember(board_id=board.id, user_id=sam.id, role=BoardRole.viewer),
        ])

        now = datetime.now(timezone.utc)
        tasks = [
            ("Draft launch blog post", TaskStatus.todo, 0, demo.id, now + timedelta(days=3)),
            ("Design landing page hero", TaskStatus.todo, 1, alex.id, now + timedelta(days=5)),
            ("Set up analytics events", TaskStatus.in_progress, 0, demo.id, now + timedelta(days=2)),
            ("Write API documentation", TaskStatus.in_progress, 1, alex.id, None),
            ("Finalize pricing page", TaskStatus.done, 0, sam.id, now - timedelta(days=1)),
            ("Create demo video", TaskStatus.done, 1, demo.id, None),
        ]
        for title, status_, pos, assignee, due in tasks:
            db.add(Task(
                board_id=board.id, title=title, status=status_, position=pos,
                assignee_id=assignee, due_date=due,
            ))

        await db.commit()
        print("Seeded demo data. Login: demo@taskflow.app / demo1234")


if __name__ == "__main__":
    asyncio.run(seed())
