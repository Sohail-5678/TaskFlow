# Architecture

## Overview

TaskFlow is a two-tier app: a React SPA talking to a FastAPI service over REST
and WebSockets, backed by PostgreSQL.

```
React + TS (Vercel)  ──REST──▶  FastAPI (Azure App Service)  ──SQL──▶  PostgreSQL
         ▲                              │
         └──────────WebSocket───────────┘
```

## Backend layering

```
app/
├── main.py            app wiring, CORS, routers, table bootstrap
├── core/
│   ├── config.py      typed settings from env (.env)
│   └── security.py    bcrypt hashing + JWT encode/decode
├── db/base.py         async engine + session + Base
├── models/            SQLAlchemy ORM (users, boards, members, tasks, activity)
├── schemas/           Pydantic request/response contracts
├── api/
│   ├── deps.py        get_current_user + require_board_role (RBAC)
│   ├── auth.py        register / login / me
│   ├── boards.py      board CRUD + member management
│   ├── tasks.py       task CRUD, pagination, drag-&-drop move
│   └── ws.py          WebSocket endpoint (token-authenticated)
└── realtime/hub.py    in-process pub/sub for board rooms
```

## Key design decisions

**Why a `board_members` join table?**
It normalizes the many-to-many between users and boards and stores the member's
**role** on the relationship, which is exactly where RBAC belongs. Membership and
role checks are a single indexed lookup.

**Why a composite index on `(board_id, status, position)`?**
Loading a board means "give me this board's tasks, grouped by column, in order."
That index lets Postgres satisfy the query with one ordered index scan instead of
sorting in memory, which keeps board loads fast as task counts grow.

**Why integer `position` instead of array ordering?**
Each column keeps a dense 0..n ordering. A move recomputes positions for the
destination column in one pass, which is simple, correct, and index-friendly.

**Why an in-process WebSocket hub (no Redis)?**
A single free App Service instance needs no cross-process fan-out, so an in-memory
hub keeps the cost at $0 and the code simple. The `broadcast()` interface is the
same one a Redis pub/sub backend would expose, so scaling out later is a drop-in
change rather than a rewrite.

**Why optimistic UI + server reconciliation on drag?**
The card moves instantly on drop (optimistic cache update), then the server's
`task.moved` event / refetch reconciles every client to the authoritative order,
so concurrent edits by different members converge.

## Request lifecycle (create a task)

1. Client `POST /api/boards/{id}/tasks` with the JWT.
2. `get_current_user` validates the token; `require_board_role(member)` checks RBAC.
3. The row is inserted at the end of its column (`max(position)+1`).
4. The server broadcasts `task.created` to everyone on the board.
5. Each client refetches/patches and the new card appears for all members.
