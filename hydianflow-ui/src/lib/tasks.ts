import { api } from "./api";

export type Status = "todo" | "in_progress" | "done";

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  status: Status;
  position: number;
  creator_id: number;
  assignee_id?: number | null;
  repo_full_name?: string | null;     
  branch_hint?: string | null;   
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskList {
  items: Task[];
  next_cursor: number;
}

export interface TaskCreateRequest {
  title: string;
  description?: string;
  status?: Status | "completed"; // server normalizes "completed" -> "done"
  position?: number;
  repo_full_name?: string;
  branch_hint?: string;
}

export interface TaskUpdateRequest {
  title?: string;
  description?: string;
  status?: Status | "completed";
  assignee_id?: number;
  position?: number;
  repo_full_name?: string | null;  
  branch_hint?: string | null;
}

function qs(params: Record<string, any>): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return q ? `?${q}` : "";
}

export function getAllTasks(opts: { status?: Status; limit?: number; cursor?: number } = {}) {
  return api.get<TaskList>(`/api/v1/tasks${qs(opts)}`);
}

export function createTask(body: TaskCreateRequest) {
  return api.post<Task>(`/api/v1/tasks`, body);
}

export function getTask(id: number) {
  return api.get<Task>(`/api/v1/tasks/${id}`);
}

export function updateTask(id: number, patch: TaskUpdateRequest) {
  return api.patch<Task>(`/api/v1/tasks/${id}`, patch);
}

export function deleteTask(id: number) {
  return api.delete<{ ok: string }>(`/api/v1/tasks/${id}`);
}

export const moveTask = (id: number, status: Status | "completed") =>
  updateTask(id, { status });

export const reorderTask = (id: number, position: number) =>
  updateTask(id, { position });
