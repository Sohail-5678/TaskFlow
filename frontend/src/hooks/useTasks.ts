import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { BoardColumns, Task, TaskStatus } from "../types";

export function useBoardTasks(boardId: number) {
  return useQuery({
    queryKey: ["tasks", boardId],
    queryFn: async () => (await api.get<BoardColumns>(`/boards/${boardId}/tasks`)).data,
    enabled: Number.isFinite(boardId),
  });
}

export function useCreateTask(boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      status: TaskStatus;
      due_date?: string | null;
      assignee_id?: number | null;
    }) => (await api.post<Task>(`/boards/${boardId}/tasks`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", boardId] }),
  });
}

export function useMoveTask(boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { taskId: number; status: TaskStatus; position: number }) =>
      (
        await api.post<Task>(`/boards/${boardId}/tasks/${payload.taskId}/move`, {
          status: payload.status,
          position: payload.position,
        })
      ).data,
    // Re-sync from the authoritative server state after a move.
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks", boardId] }),
  });
}

export function useUpdateTask(boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      taskId: number;
      data: Partial<Pick<Task, "title" | "description" | "due_date" | "assignee_id">>;
    }) => (await api.patch<Task>(`/boards/${boardId}/tasks/${payload.taskId}`, payload.data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", boardId] }),
  });
}

export function useDeleteTask(boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: number) =>
      await api.delete(`/boards/${boardId}/tasks/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", boardId] }),
  });
}
