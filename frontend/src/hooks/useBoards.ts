import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { demoApi } from "../demo/demoStore";
import type { Board, BoardDetail } from "../types";

const DEMO = demoApi.isEnabled();

export function useBoards() {
  return useQuery({
    queryKey: ["boards"],
    queryFn: async () =>
      DEMO ? demoApi.listBoards() : (await api.get<Board[]>("/boards")).data,
  });
}

export function useBoard(boardId: number) {
  return useQuery({
    queryKey: ["board", boardId],
    queryFn: async () =>
      DEMO
        ? demoApi.getBoard(boardId)
        : (await api.get<BoardDetail>(`/boards/${boardId}`)).data,
    enabled: Number.isFinite(boardId),
  });
}

export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string }) =>
      DEMO
        ? demoApi.createBoard(payload.name, payload.description)
        : (await api.post<Board>("/boards", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boards"] }),
  });
}

export function useAddMember(boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { email: string; role: string }) =>
      DEMO
        ? demoApi.addMember(boardId, payload.email, payload.role as any)
        : (await api.post(`/boards/${boardId}/members`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}
