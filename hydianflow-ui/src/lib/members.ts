import { api } from "./api";

export type Member = {
  id: number;
  name: string;
  avatar_url?: string;
  github_login?: string;
};

export function listProjectMembers(projectId: number) {
  return api.get<Member[]>(`/api/v1/projects/${projectId}/members`);
}
