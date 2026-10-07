import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Board, BoardDetail } from "../types";

export function useBoards() {
  return useQuery({
    queryKey: ["boards"],
    queryFn: async () => (await api.get<Board[]>("/boards")).data,
  });
}

export function useBoard(boardId: number) {
  return useQuery({
    queryKey: ["board", boardId],
    queryFn: async () => (await api.get<BoardDetail>(`/boards/${boardId}`)).data,
    enabled: Number.isFinite(boardId),
  });
}

export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string }) =>
      (await api.post<Board>("/boards", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boards"] }),
  });
}

export function useAddMember(boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { email: string; role: string }) =>
      (await api.post(`/boards/${boardId}/members`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}
