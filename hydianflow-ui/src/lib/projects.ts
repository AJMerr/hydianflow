import { api } from "@/lib/api";

export type Project = {
  id: number;
  owner_id: number;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
};

export interface ProjectUpdateRequest { name?: string; description?: string | null; }

export async function listProjects() {
  return api.get<Project[]>("/api/v1/projects");
}

export async function getProject(id: number) {
  return api.get<Project>(`/api/v1/projects/${id}`);
}

export async function createProject(body: { name: string; description?: string }) {
  return api.post<Project>("/api/v1/projects", body);
}

export function updateProject(id: number, body: ProjectUpdateRequest) {
  return api.patch<Project>(`/api/v1/projects/${id}`, body);
}

export async function deleteProject(id: number) {
  return api.delete<{ ok: string }>(`/api/v1/projects/${id}`);
}
