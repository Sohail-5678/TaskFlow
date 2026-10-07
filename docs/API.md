# TaskFlow API Reference

Base URL: `${API_URL}/api` · Interactive docs: `${API_URL}/docs` (Swagger UI)

All endpoints except `/auth/register` and `/auth/login` require a
`Authorization: Bearer <JWT>` header.

## Auth

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `{email, full_name, password}` | Returns `{access_token, user}` |
| POST | `/auth/login` | `{email, password}` | Returns `{access_token, user}` |
| GET | `/auth/me` | — | Current user |

## Boards

| Method | Path | Min role | Notes |
|---|---|---|---|
| GET | `/boards` | — | Boards you own or belong to (with your role) |
| POST | `/boards` | — | Create a board (you become admin) |
| GET | `/boards/{id}` | viewer | Board detail + members |
| PATCH | `/boards/{id}` | admin | Rename / edit description |
| DELETE | `/boards/{id}` | admin | Delete board |

## Members (RBAC)

| Method | Path | Min role | Notes |
|---|---|---|---|
| POST | `/boards/{id}/members` | admin | `{email, role}` — add a member |
| PATCH | `/boards/{id}/members/{user_id}` | admin | `{role}` — change a member's role |
| DELETE | `/boards/{id}/members/{user_id}` | admin | Remove a member |

## Tasks

| Method | Path | Min role | Notes |
|---|---|---|---|
| GET | `/boards/{id}/tasks` | viewer | Tasks grouped by column, ordered by position |
| GET | `/boards/{id}/tasks/search?q=&page=&page_size=` | viewer | Paginated search |
| POST | `/boards/{id}/tasks` | member | Create a task |
| PATCH | `/boards/{id}/tasks/{task_id}` | member | Update fields |
| POST | `/boards/{id}/tasks/{task_id}/move` | member | `{status, position}` — drag & drop move |
| DELETE | `/boards/{id}/tasks/{task_id}` | member | Delete a task |

## WebSocket

```
WSS  /ws/boards/{board_id}?token=<JWT>
```

The server pushes typed events to all connected members of the board:

| Event | Payload |
|---|---|
| `task.created` | the created task |
| `task.updated` | the updated task |
| `task.moved` | the moved task (new status + position) |
| `task.deleted` | `{id, board_id}` |

## Roles

| Role | View | Edit tasks | Manage members | Delete board |
|---|:--:|:--:|:--:|:--:|
| viewer | ✅ | ❌ | ❌ | ❌ |
| member | ✅ | ✅ | ❌ | ❌ |
| admin (owner) | ✅ | ✅ | ✅ | ✅ |
