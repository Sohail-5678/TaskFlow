export type TaskStatus = "todo" | "in_progress" | "done";
export type BoardRole = "viewer" | "member" | "admin";

export interface User {
  id: number;
  email: string;
  full_name: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Board {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  created_at: string;
  role?: BoardRole;
}

export interface Member {
  user: User;
  role: BoardRole;
}

export interface BoardDetail extends Board {
  members: Member[];
}

export interface Task {
  id: number;
  board_id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  position: number;
  due_date: string | null;
  assignee_id: number | null;
  assignee: User | null;
  created_at: string;
  updated_at: string;
}

export interface BoardColumns {
  columns: Record<TaskStatus, Task[]>;
}

export const COLUMN_META: { key: TaskStatus; label: string; accent: string }[] = [
  { key: "todo", label: "To Do", accent: "#6366f1" },
  { key: "in_progress", label: "In Progress", accent: "#f59e0b" },
  { key: "done", label: "Done", accent: "#10b981" },
];
