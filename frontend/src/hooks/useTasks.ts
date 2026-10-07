import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { demoApi } from "../demo/demoStore";
import type { BoardColumns, Task, TaskStatus } from "../types";

const DEMO = demoApi.isEnabled();

export function useBoardTasks(boardId: number) {
  return useQuery({
    queryKey: ["tasks", boardId],
    queryFn: async () =>
      DEMO
        ? demoApi.getTasks(boardId)
        : (await api.get<BoardColumns>(`/boards/${boardId}/tasks`)).data,
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
    }) =>
      DEMO
        ? demoApi.createTask(boardId, payload)
        : (await api.post<Task>(`/boards/${boardId}/tasks`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", boardId] }),
  });
}

export function useMoveTask(boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { taskId: number; status: TaskStatus; position: number }) =>
      DEMO
        ? demoApi.moveTask(boardId, payload.taskId, payload.status, payload.position)
        : (
            await api.post<Task>(`/boards/${boardId}/tasks/${payload.taskId}/move`, {
              status: payload.status,
              position: payload.position,
            })
          ).data,
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks", boardId] }),
  });
}

export function useUpdateTask(boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      taskId: number;
      data: Partial<Pick<Task, "title" | "description" | "due_date" | "assignee_id">>;
    }) =>
      DEMO
        ? demoApi.updateTask(boardId, payload.taskId, payload.data)
        : (await api.patch<Task>(`/boards/${boardId}/tasks/${payload.taskId}`, payload.data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", boardId] }),
  });
}

export function useDeleteTask(boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: number) => {
      if (DEMO) {
        demoApi.deleteTask(boardId, taskId);
        return;
      }
      await api.delete(`/boards/${boardId}/tasks/${taskId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", boardId] }),
  });
}
