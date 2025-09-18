import { api } from "./api";

export type Me = {
  id: number;
  name: string;
  github_login: string;
  avatar_url?: string;
};

type Envelope<T> = { data: T };

export async function getMe(): Promise<Me | null> {
  try {
    const resp = await api.get<Envelope<Me>>("/api/v1/auth/me");
    return resp.data;
  } catch (e: any) {
    // Treat 401/403 as “not signed in”
    if (String(e.message).toLowerCase().includes("unauthorized")) return null;
    throw e;
  }
}

export function githubStartURL(next = "/") {
  const url = new URL("/api/v1/auth/github/start", window.location.origin);
  url.searchParams.set("next", next);
  return url.toString();
}

export async function logout(): Promise<void> {
  await api.post("/api/v1/auth/logout");
}
