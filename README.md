<div align="center">

# 🗂️ TaskFlow

### Collaborative Task & Project Management Platform

**Live Demo:** [taskflow.vercel.app](https://taskflow.vercel.app) &nbsp;·&nbsp; **API Docs:** `/docs`

*A full-stack Kanban collaboration tool with real-time boards, JWT auth, role-based access control, and a normalized PostgreSQL backend.*

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Azure](https://img.shields.io/badge/Azure-App%20Service-0078D4?logo=microsoftazure&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Frontend-000000?logo=vercel&logoColor=white)

</div>

---

## ✨ Overview

TaskFlow is a team collaboration platform where members create **boards**, add **tasks**, assign teammates, set **due dates**, and drag work across **To Do → In Progress → Done** columns. Every change is pushed to all connected members **instantly over WebSockets**, so the board stays in sync without a refresh.

> **🔎 Live demo runs in "demo mode."** The public link at
> [taskflow-dv.vercel.app](https://taskflow-dv.vercel.app) is a **frontend-only** build that
> stores data in your browser (localStorage), so you can try boards and drag-and-drop
> instantly with no login and no backend. The moment the frontend is pointed at a running
> API (`VITE_API_URL`), it automatically switches to the **full stack** — JWT auth, RBAC,
> PostgreSQL, and real-time WebSocket sync — all of which live in [`backend/`](backend/).

This project is built to showcase production-grade full-stack engineering end to end:

| Resume Claim | Where It Lives |
|---|---|
| Full-stack boards with To Do / In Progress / Done + drag & drop | `frontend/` (React + TS, dnd-kit) |
| Python FastAPI REST API | `backend/app/api/` |
| Normalized PostgreSQL schema (users, boards, tasks, assignments) | `backend/app/models/` |
| Optimized SQL with indexing + pagination | `backend/app/models/*.py`, `backend/app/api/tasks.py` |
| JWT authentication + role-based access control | `backend/app/core/security.py`, `backend/app/api/deps.py` |
| Real-time board updates over WebSockets | `backend/app/realtime/`, `frontend/src/hooks/useBoardSocket.ts` |
| Azure App Service (Linux) + Static Web Apps + GitHub Actions | `.github/workflows/`, `azure/` |
| Vercel frontend deploy (`taskflow.vercel.app`) | `frontend/vercel.json` |

---

## 🏗️ Architecture

```
                         ┌──────────────────────────────┐
                         │   React + TypeScript (Vite)   │
   Browser  ◀──────────▶ │   dnd-kit · TanStack Query    │
                         │   Deployed on Vercel          │
                         └───────────────┬──────────────┘
                                         │  REST (HTTPS)  +  WebSocket (WSS)
                                         ▼
                         ┌──────────────────────────────┐
                         │     FastAPI (Python 3.11)     │
                         │  JWT auth · RBAC · WS hub     │
                         │  Deployed on Azure App Service│
                         └───────────────┬──────────────┘
                                         │  SQLAlchemy (async)
                                         ▼
                         ┌──────────────────────────────┐
                         │  Azure Database for PostgreSQL │
                         │  users · boards · members ·   │
                         │  tasks · activity (indexed)   │
                         └──────────────────────────────┘
```

---

## 🧱 Data Model (Normalized, 3NF)

```
users ──< board_members >── boards ──< tasks
  │                            │          │
  └──────── owns ──────────────┘          └──< task assignees (users)

• users        (id, email, hashed_password, full_name, created_at)
• boards       (id, name, description, owner_id → users, created_at)
• board_members(id, board_id → boards, user_id → users, role)   ← RBAC join table
• tasks        (id, board_id → boards, title, description, status,
                position, due_date, assignee_id → users, created_at, updated_at)
• activity_log (id, board_id, actor_id, action, created_at)      ← audit trail
```

**Indexes that keep board loads fast:**
- `ix_tasks_board_status_position` — composite index on `(board_id, status, position)` so a board's columns load in sorted order with one index scan.
- `ix_board_members_board_user` — unique composite for O(1) membership/role checks.
- `ix_tasks_due_date` — supports due-soon queries and pagination ordering.

---

## 🔐 Auth & Roles (RBAC)

- **JWT** access tokens signed with HS256; passwords hashed with **bcrypt**.
- Three board roles enforced on every mutating endpoint:

| Role | Can view | Can edit tasks | Can manage members | Can delete board |
|------|:--------:|:--------------:|:------------------:|:----------------:|
| `viewer` | ✅ | ❌ | ❌ | ❌ |
| `member` | ✅ | ✅ | ❌ | ❌ |
| `admin`/owner | ✅ | ✅ | ✅ | ✅ |

Role checks live in reusable FastAPI dependencies (`require_board_role(...)`), so authorization is declarative and testable.

---

## ⚡ Real-Time Sync

A lightweight in-process **connection hub** (`backend/app/realtime/hub.py`) tracks WebSocket clients per board. When a task is created, moved, or updated, the API broadcasts a typed event (`task.created`, `task.moved`, `task.updated`, `task.deleted`) to everyone watching that board. The React client applies the patch optimistically and reconciles with the server event.

---

## 🚀 Quick Start (Local)

### Prerequisites
- Python 3.11+, Node 18+, and either Docker or a local/Azure PostgreSQL.

### 1. Backend

```bash
cd backend
cp .env.example .env            # fill in DATABASE_URL + SECRET_KEY
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head            # create tables
python -m app.seed              # optional: demo data (demo@taskflow.app / demo1234)
uvicorn app.main:app --reload   # http://localhost:8000  (docs at /docs)
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env            # VITE_API_URL=http://localhost:8000
npm install
npm run dev                     # http://localhost:5173
```

### 3. One-command local stack (Docker)

```bash
docker compose up --build       # api :8000 · db :5432 · adminer :8080
```

---

## ☁️ Deployment

### Frontend → Vercel (`taskflow.vercel.app`)
Push to `main`; Vercel builds `frontend/` using `vercel.json`. Set the project env var `VITE_API_URL` to your Azure API URL. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

### Backend → Azure App Service (Linux, free F1)
`.github/workflows/azure-backend.yml` builds and deploys the FastAPI app on every push to `main`. Database is **Azure Database for PostgreSQL (free tier)**. Full walkthrough in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## 🧪 Tests

```bash
cd backend && pytest -q         # auth, RBAC, task ordering, pagination
```

---

## 📂 Repository Layout

```
taskflow/
├── backend/            FastAPI app, models, migrations, tests
├── frontend/           React + TypeScript (Vite) client
├── azure/              Azure infra notes & startup config
├── .github/workflows/  CI/CD for Vercel + Azure
├── docs/               Architecture, API, and deployment guides
└── docker-compose.yml  Local full stack
```

---

## 👤 Author

**Ameer Sohail Shaik** — [Portfolio](https://ameer-shaik.vercel.app/) · [LinkedIn](https://www.linkedin.com/in/ameer-shaik-9a6309202/) · [GitHub](https://github.com/Sohail-5678)

Built as a portfolio project demonstrating full-stack design, relational data modeling, auth/RBAC, real-time systems, and cloud CI/CD.
