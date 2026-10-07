/**
 * Frontend-only "demo mode" data layer.
 *
 * When no backend is configured (VITE_API_URL is unset), the app runs entirely
 * in the browser and persists boards/tasks to localStorage. This lets the live
 * Vercel deployment work with zero backend and $0 cost. The full FastAPI
 * backend (JWT auth, RBAC, Postgres, WebSockets) still lives in /backend and is
 * used automatically whenever VITE_API_URL points at a running API.
 */
import type {
  Board,
  BoardColumns,
  BoardDetail,
  Member,
  Task,
  TaskStatus,
  User,
} from "../types";

const KEY = "taskflow_demo_state_v1";

interface DemoState {
  user: User;
  boards: Board[];
  members: Record<number, Member[]>; // boardId -> members
  tasks: Record<number, Task[]>; // boardId -> tasks
  seq: number; // id generator
}

const DEMO_USER: User = {
  id: 1,
  email: "demo@taskflow.app",
  full_name: "Demo User",
  created_at: new Date().toISOString(),
};

const TEAM: User[] = [
  DEMO_USER,
  { id: 2, email: "alex@taskflow.app", full_name: "Alex Rivera", created_at: new Date().toISOString() },
  { id: 3, email: "sam@taskflow.app", full_name: "Sam Lee", created_at: new Date().toISOString() },
];

function now(): string {
  return new Date().toISOString();
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function seed(): DemoState {
  const boardId = 1;
  const members: Member[] = [
    { user: TEAM[0], role: "admin" },
    { user: TEAM[1], role: "member" },
    { user: TEAM[2], role: "viewer" },
  ];

  const tasks: Task[] = [
    mk(1, boardId, "Draft launch blog post", "todo", 0, TEAM[0], daysFromNow(3), "Write the announcement for the public launch."),
    mk(2, boardId, "Design landing page hero", "todo", 1, TEAM[1], daysFromNow(5), null),
    mk(3, boardId, "Set up analytics events", "in_progress", 0, TEAM[0], daysFromNow(2), "Track signups and board creation."),
    mk(4, boardId, "Write API documentation", "in_progress", 1, TEAM[1], null, null),
    mk(5, boardId, "Finalize pricing page", "done", 0, TEAM[2], daysFromNow(-1), null),
    mk(6, boardId, "Create demo video", "done", 1, TEAM[0], null, "60-second product walkthrough."),
  ];

  return {
    user: DEMO_USER,
    boards: [
      {
        id: boardId,
        name: "Product Launch",
        description: "Q3 go-to-market tasks",
        owner_id: 1,
        created_at: now(),
        role: "admin",
      },
    ],
    members: { [boardId]: members },
    tasks: { [boardId]: tasks },
    seq: 100,
  };
}

function mk(
  id: number,
  board_id: number,
  title: string,
  status: TaskStatus,
  position: number,
  assignee: User | null,
  due_date: string | null,
  description: string | null
): Task {
  return {
    id,
    board_id,
    title,
    description,
    status,
    position,
    due_date,
    assignee_id: assignee?.id ?? null,
    assignee,
    created_at: now(),
    updated_at: now(),
  };
}

function load(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DemoState;
  } catch {
    /* ignore */
  }
  const fresh = seed();
  save(fresh);
  return fresh;
}

function save(state: DemoState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function nextId(state: DemoState): number {
  state.seq += 1;
  return state.seq;
}

function userById(id: number | null): User | null {
  if (id == null) return null;
  return TEAM.find((u) => u.id === id) ?? null;
}

// ---- Public demo API (mirrors the real API's responses) ----

export const demoApi = {
  isEnabled(): boolean {
    // Demo mode is on when no backend URL is configured.
    return !import.meta.env.VITE_API_URL;
  },

  currentUser(): User {
    return load().user;
  },

  reset(): void {
    const fresh = seed();
    save(fresh);
  },

  listBoards(): Board[] {
    return load().boards;
  },

  getBoard(boardId: number): BoardDetail {
    const s = load();
    const board = s.boards.find((b) => b.id === boardId)!;
    return { ...board, members: s.members[boardId] ?? [] };
  },

  createBoard(name: string, description?: string): Board {
    const s = load();
    const id = nextId(s);
    const board: Board = {
      id,
      name,
      description: description ?? null,
      owner_id: s.user.id,
      created_at: now(),
      role: "admin",
    };
    s.boards.unshift(board);
    s.members[id] = [{ user: s.user, role: "admin" }];
    s.tasks[id] = [];
    save(s);
    return board;
  },

  getTasks(boardId: number): BoardColumns {
    const s = load();
    const list = (s.tasks[boardId] ?? []).slice();
    const columns: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const t of list) columns[t.status].push(t);
    (Object.keys(columns) as TaskStatus[]).forEach((k) =>
      columns[k].sort((a, b) => a.position - b.position)
    );
    return { columns };
  },

  createTask(
    boardId: number,
    payload: { title: string; description?: string; status: TaskStatus; due_date?: string | null; assignee_id?: number | null }
  ): Task {
    const s = load();
    const list = s.tasks[boardId] ?? [];
    const maxPos = list.filter((t) => t.status === payload.status).reduce((m, t) => Math.max(m, t.position), -1);
    const task = mk(
      nextId(s),
      boardId,
      payload.title,
      payload.status,
      maxPos + 1,
      userById(payload.assignee_id ?? null),
      payload.due_date ?? null,
      payload.description ?? null
    );
    list.push(task);
    s.tasks[boardId] = list;
    save(s);
    return task;
  },

  updateTask(
    boardId: number,
    taskId: number,
    data: Partial<Pick<Task, "title" | "description" | "due_date" | "assignee_id">>
  ): Task {
    const s = load();
    const task = (s.tasks[boardId] ?? []).find((t) => t.id === taskId)!;
    Object.assign(task, data);
    if ("assignee_id" in data) task.assignee = userById(task.assignee_id);
    task.updated_at = now();
    save(s);
    return task;
  },

  moveTask(boardId: number, taskId: number, status: TaskStatus, position: number): Task {
    const s = load();
    const list = s.tasks[boardId] ?? [];
    const task = list.find((t) => t.id === taskId)!;

    const dest = list
      .filter((t) => t.status === status && t.id !== taskId)
      .sort((a, b) => a.position - b.position);
    const insertAt = Math.max(0, Math.min(position, dest.length));
    const reordered = [...dest.slice(0, insertAt), task, ...dest.slice(insertAt)];
    reordered.forEach((t, idx) => {
      t.status = status;
      t.position = idx;
    });
    task.updated_at = now();
    save(s);
    return task;
  },

  deleteTask(boardId: number, taskId: number): void {
    const s = load();
    s.tasks[boardId] = (s.tasks[boardId] ?? []).filter((t) => t.id !== taskId);
    save(s);
  },

  addMember(boardId: number, email: string, role: Member["role"]): Member {
    const s = load();
    const existing = TEAM.find((u) => u.email === email);
    const user: User =
      existing ?? {
        id: nextId(s),
        email,
        full_name: email.split("@")[0],
        created_at: now(),
      };
    const members = s.members[boardId] ?? [];
    if (!members.some((m) => m.user.email === email)) {
      members.push({ user, role });
      s.members[boardId] = members;
      save(s);
    }
    return { user, role };
  },
};
