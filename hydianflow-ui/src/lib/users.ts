import { api } from './api'

export type UserLite = { id: number; name: string; github_login?: string };

export async function bulkGetUsers(ids: number[]) {
  if (!ids.length) return [] as UserLite[];
  const qs = encodeURIComponent(ids.join(","));
  return api.get<UserLite[]>(`/api/v1/users?ids=${qs}`);
}
