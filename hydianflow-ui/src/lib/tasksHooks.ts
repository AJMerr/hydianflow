import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { createTask, deleteTask as apiDeleteTask, getAllTasks, updateTask, type Status, type Task } from "@/lib/tasks";

type Me = { id: number; name: string; github_login?: string; avatar_url?: string };

export function useTasksColumn(status: Status) {
  const qc = useQueryClient();
  const me = useQuery<Me>({ queryKey: ["me"], queryFn: () => api.get<Me>("/api/v1/auth/me"), retry: false, refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 });
  const q = useQuery({
    queryKey: ["tasks", status],
    enabled: me.isSuccess,
    queryFn: () => getAllTasks({ status }),
  });
  return {
    items: q.data?.items ?? [],
    nextCursor: q.data?.next_cursor ?? 0,
    isLoading: q.isLoading,
    isError: q.isError,
    refetch: q.refetch,
    invalidate: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  };
}

export function useCreateTask(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; description?: string; repo_full_name?: string; branch_hint?: string }) =>
      createTask(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      onDone?.();
    },
  });
}

export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, to }: { id: number; to: Status | "completed" }) =>
      updateTask(id, { status: to }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiDeleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useEditTask(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: number; title?: string; description?: string; repo_full_name?: string | null; branch_hint?: string | null }) =>
      updateTask(p.id, {
        title: p.title,
        description: p.description,
        repo_full_name: p.repo_full_name ?? null,
        branch_hint: p.branch_hint ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      onDone?.();
    },
  });
}

export type { Status, Task };


