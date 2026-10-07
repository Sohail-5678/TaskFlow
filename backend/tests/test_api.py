"""End-to-end API tests covering auth, RBAC, task ordering, and pagination.

Run:  pytest -q
Uses an isolated SQLite file so tests cost nothing and need no services.
"""
import asyncio
import os

import pytest
import pytest_asyncio

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_taskflow.db"
os.environ["SECRET_KEY"] = "test-secret"

from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.db.base import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest_asyncio.fixture(autouse=True)
async def _fresh_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def _register(client, email, name="Test User", password="password123"):
    r = await client.post("/api/auth/register", json={"email": email, "full_name": name, "password": password})
    assert r.status_code == 201, r.text
    return r.json()


@pytest.mark.asyncio
async def test_register_and_login(client):
    data = await _register(client, "a@test.com")
    assert data["access_token"]
    assert data["user"]["email"] == "a@test.com"

    r = await client.post("/api/auth/login", json={"email": "a@test.com", "password": "password123"})
    assert r.status_code == 200
    assert r.json()["access_token"]


@pytest.mark.asyncio
async def test_board_and_task_flow(client):
    owner = await _register(client, "owner@test.com")
    headers = {"Authorization": f"Bearer {owner['access_token']}"}

    # Create board
    r = await client.post("/api/boards", json={"name": "My Board"}, headers=headers)
    assert r.status_code == 201
    board = r.json()
    assert board["role"] == "admin"
    bid = board["id"]

    # Create tasks in the todo column
    for title in ["First", "Second", "Third"]:
        r = await client.post(f"/api/boards/{bid}/tasks", json={"title": title}, headers=headers)
        assert r.status_code == 201

    # They should come back ordered by position
    r = await client.get(f"/api/boards/{bid}/tasks", headers=headers)
    todo = r.json()["columns"]["todo"]
    assert [t["title"] for t in todo] == ["First", "Second", "Third"]
    assert [t["position"] for t in todo] == [0, 1, 2]

    # Move the third task to the top of in_progress
    third_id = todo[2]["id"]
    r = await client.post(
        f"/api/boards/{bid}/tasks/{third_id}/move",
        json={"status": "in_progress", "position": 0},
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "in_progress"

    r = await client.get(f"/api/boards/{bid}/tasks", headers=headers)
    cols = r.json()["columns"]
    assert len(cols["todo"]) == 2
    assert cols["in_progress"][0]["title"] == "Third"


@pytest.mark.asyncio
async def test_rbac_viewer_cannot_edit(client):
    owner = await _register(client, "owner2@test.com")
    viewer = await _register(client, "viewer@test.com")
    owner_h = {"Authorization": f"Bearer {owner['access_token']}"}
    viewer_h = {"Authorization": f"Bearer {viewer['access_token']}"}

    bid = (await client.post("/api/boards", json={"name": "RBAC"}, headers=owner_h)).json()["id"]

    # Add viewer as a read-only member
    r = await client.post(
        f"/api/boards/{bid}/members",
        json={"email": "viewer@test.com", "role": "viewer"},
        headers=owner_h,
    )
    assert r.status_code == 201

    # Viewer can read
    assert (await client.get(f"/api/boards/{bid}/tasks", headers=viewer_h)).status_code == 200
    # Viewer cannot create (needs 'member')
    r = await client.post(f"/api/boards/{bid}/tasks", json={"title": "Nope"}, headers=viewer_h)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_pagination(client):
    owner = await _register(client, "owner3@test.com")
    h = {"Authorization": f"Bearer {owner['access_token']}"}
    bid = (await client.post("/api/boards", json={"name": "Paged"}, headers=h)).json()["id"]

    for i in range(25):
        await client.post(f"/api/boards/{bid}/tasks", json={"title": f"Task {i}"}, headers=h)

    r = await client.get(f"/api/boards/{bid}/tasks/search?page=1&page_size=10", headers=h)
    body = r.json()
    assert body["total"] == 25
    assert len(body["items"]) == 10
    assert body["has_next"] is True

    r = await client.get(f"/api/boards/{bid}/tasks/search?page=3&page_size=10", headers=h)
    body = r.json()
    assert len(body["items"]) == 5
    assert body["has_next"] is False
