import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { createTask, deleteTask as apiDeleteTask, getAllTasks, updateTask, type TaskUpdateRequest, type Status, type Task } from "@/lib/tasks";
import { toast } from "sonner"

type Me = { id: number; name: string; github_login?: string; avatar_url?: string };

export function useTasksColumn(status: Status, projectId?: number) {
  const qc = useQueryClient();
  const me = useQuery<Me>({ queryKey: ["me"], queryFn: () => api.get<Me>("/api/v1/auth/me"), retry: false, refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 });
  const q = useQuery({
    queryKey: ["tasks", projectId ?? "global", status],
    enabled: me.isSuccess,
    queryFn: () => getAllTasks({ status, project_id: projectId }),
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
    mutationFn: (body: { title: string; description?: string; repo_full_name?: string; branch_hint?: string; project_id?: number }) =>
      createTask(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      onDone?.();
      toast.success("Task created");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to create task";
      toast.error(msg)
    }
  });
}

export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, to }: { id: number; to: Status | "completed" }) =>
      updateTask(id, { status: to }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      const label = vars.to === "completed" || vars.to === "done" ? "Task completed" : `Moved to ${vars.to.replace("_", " ")}`;
      toast.success(label);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to move task";
      toast.error(msg);
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiDeleteTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to delete task";
      toast.error(msg);
    },
  });
}

export function useEditTask(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: number } & TaskUpdateRequest) =>
      updateTask(p.id, {
        title: p.title,
        description: p.description,
        repo_full_name: p.repo_full_name ?? null,
        branch_hint: p.branch_hint ?? null,
        assignee_id: p.assignee_id ?? null,
        status: p.status,
        position: p.position,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      onDone?.();
      toast.success("Task updated");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to edit task";
      toast.error(msg);
    },
  });
}
export type { Status, Task };


