import { api } from "@/lib/api";

export type Project = {
  id: number;
  owner_id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
};

export async function listProjects() {
  return api.get<Project[]>("/api/v1/projects");
}

export async function getProject(id: number) {
  return api.get<Project>(`/api/v1/projects/${id}`);
}

export async function createProject(body: { name: string; description?: string }) {
  return api.post<Project>("/api/v1/projects", body);
}

export async function updateProject(id: number, body: { name?: string; description?: string }) {
  return api.patch<Project>(`/api/v1/projects/${id}`, body);
}
