import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type RepoOpt = { full_name: string; name?: string; private?: boolean; default_branch?: string };

export function qstr(params: Record<string, any>) {
  const s = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return s ? `?${s}` : "";
}

export function useRepoSearch(query: string) {
  return useQuery({
    queryKey: ["gh", "repos", query],
    enabled: query.trim().length > 0,
    queryFn: () => api.get<RepoOpt[]>(`/api/v1/github/repos${qstr({ query })}`),
    staleTime: 60_000,
  });
}

// Fetch all branches once per confirmed repo, filter client-side in UI
export function useBranchSearch(repoFullName: string, enabled: boolean) {
  const valid = /^[^/]+\/[^/]+$/.test(repoFullName.trim());
  return useQuery({
    queryKey: ["gh", "branches", repoFullName],
    enabled: enabled && valid,
    queryFn: async () => {
      const res = await api.get<any>(
        `/api/v1/github/branches${qstr({ repo_full_name: repoFullName })}`
      );
      const raw = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
      const names = raw
        .map((b: any) => b?.name ?? b?.Name ?? b?.ref ?? "")
        .filter((s: string) => !!s);
      return Array.from(new Set(names)) as string[];
    },
    staleTime: 60_000,
  });
}


