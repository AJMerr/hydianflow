let baseURL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  ""; 

let devUser: number | null = null;     // sent as X-Dev-User (dev only)
let authToken: string | null = null;   
let useCookies = true;                 // <- default to cookies for session auth

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;
  constructor(status: number, code?: string, message?: string, details?: any) {
    super(message || code || `HTTP ${status}`);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type Envelope<T> = { data: T };
type ErrorEnvelope = { error: { code: string; message: string; [k: string]: any } };

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  const url = `${baseURL}${path}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  if (devUser != null) headers["X-Dev-User"] = String(devUser);

  const req: RequestInit = {
    method,
    credentials: useCookies ? "include" : "same-origin",
    ...init,
    headers,
  };

  if (body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    req.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  const res = await fetch(url, req);

  // Allow empty responses
  const text = await res.text();
  let payload: any = undefined;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    
  }

  if (!res.ok) {
    const e = payload as ErrorEnvelope | undefined;
    throw new ApiError(res.status, e?.error?.code, e?.error?.message || res.statusText, e);
  }

  // Unwrap { data: ... } envelopes automatically
  const ok = payload as Envelope<T> | T | undefined;
  return (ok && typeof ok === "object" && "data" in ok ? (ok as Envelope<T>).data : ok) as T;
}

export const api = {
  get: <T>(path: string, init?: RequestInit) => request<T>("GET", path, undefined, init),
  post: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>("POST", path, body, init),
  patch: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>("PATCH", path, body, init),
  delete: <T>(path: string, init?: RequestInit) => request<T>("DELETE", path, undefined, init),

  // runtime tweaks
  setBaseURL(url: string) { baseURL = url.replace(/\/$/, ""); },
  setDevUser(id: number | null) { devUser = id; },
  setAuthToken(token: string | null) { authToken = token; },
  setWithCredentials(v: boolean) { useCookies = v; },
};
