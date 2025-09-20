import { useMemo, useState, useEffect } from "react";

import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

import {
  createTask,
  deleteTask as apiDeleteTask,
  getAllTasks,
  updateTask,
  type Status,
  type Task,
} from "@/lib/tasks";

import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";

const queryClient = new QueryClient();

type Me = { id: number; name: string; github_login?: string; avatar_url?: string };

// ---- GitHub picker helpers ----
type RepoOpt = { full_name: string; private?: boolean; default_branch?: string };

function qstr(params: Record<string, any>) {
  const s = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return s ? `?${s}` : "";
}

// --- small debounce helper (used only for branches) ---
function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function useRepoSearch(query: string) {
  return useQuery({
    queryKey: ["gh", "repos", query],
    enabled: query.trim().length > 0,
    queryFn: () => api.get<RepoOpt[]>(`/api/v1/github/repos${qstr({ query })}`),
    staleTime: 60_000,
  });
}

function useBranchSearch(repoFullName: string, query: string) {
  const valid = /^[^/]+\/[^/]+$/.test(repoFullName.trim());
  const qd = useDebounced(query, 300); // <- debounce branch lookups
  return useQuery({
    queryKey: ["gh", "branches", repoFullName, qd],
    enabled: valid,
    queryFn: () =>
      api.get<{ items: { name: string }[] }>(
        `/api/v1/github/branches${qstr({ repo_full_name: repoFullName, query: qd })}`
      ).then(r => r.items),
    staleTime: 60_000,
  });
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate />
    </QueryClientProvider>
  );
}

function AuthGate() {
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<Me>("/api/v1/auth/me"),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const logout = useMutation({
    mutationFn: () => api.post<void>("/api/v1/auth/logout"),
    onSuccess: async () => {
      await qc.clear();
      window.location.href = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api/v1/auth/github/start`;
    },
  });

  if (me.isLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-transparent" />
      </div>
    );
  }

  if (me.isError) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="grid gap-4 text-center">
          <h1 className="text-xl font-semibold">HydianFlow</h1>
          <a href="/api/v1/auth/github/start" className="inline-block">
            <Button>Sign in with GitHub</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <Board
      onLogout={() => logout.mutate()}
      user={me.data!}
    />
  );
}

// --- Board page ---
function Board({ onLogout, user }: { onLogout: () => void; user: Me }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("");

  const [repoQuery, setRepoQuery] = useState("");
  const [branchQuery, setBranchQuery] = useState("");

  const repos = useRepoSearch(repoQuery);
  const branches = useBranchSearch(repo, branchQuery);

  const todo = useTasksColumn("todo");
  const inProgress = useTasksColumn("in_progress");
  const done = useTasksColumn("done");

  const counts = useMemo(
    () => ({
      todo: todo.items.length,
      in_progress: inProgress.items.length,
      done: done.items.length,
    }),
    [todo.items.length, inProgress.items.length, done.items.length]
  );

  const create = useCreateTask(() => {
    setOpen(false);
    setTitle("");
    setDesc("");
    setRepo("");
    setBranch("");
    setRepoQuery("");
    setBranchQuery("");
  });

  const move = useMoveTask();
  const del = useDeleteTask();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-baseline gap-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-semibold">
              HF
            </span>
            <h1 className="text-xl font-semibold tracking-tight">HydianFlow</h1>
            <span className="text-xs text-muted-foreground">Board</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Hi, {user.name}</span>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={onLogout}>Logout</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">New Task</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create task</DialogTitle>
                  <DialogDescription>Quickly add a card to “To Do”.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      placeholder="e.g. Wire /tasks to UI"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      className="min-h-[96px] rounded-md border bg-background px-3 py-2 text-sm outline-none ring-[--color-ring] focus:ring-2"
                      placeholder="Optional details…"
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium">Repo full name</label>
                    <Input
                      list="repo-options"
                      placeholder="owner/repo (optional)"
                      value={repo}
                      onChange={(e) => setRepo(e.target.value)}
                      onInput={(e) => setRepoQuery((e.target as HTMLInputElement).value)}
                    />
                    <datalist id="repo-options">
                      {(repos.data ?? []).map((r) => (
                        <option key={r.full_name} value={r.full_name}>
                          {r.full_name}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium">Branch hint</label>
                    <Input
                      list="branch-options"
                      placeholder="feature/my-branch (optional)"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      onInput={(e) => setBranchQuery((e.target as HTMLInputElement).value)}
                      disabled={!repo}
                    />
                    <datalist id="branch-options">
                      {(branches.data ?? []).map((b) => (
                        <option key={b.name} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </datalist>
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      create.mutate({
                        title: title.trim(),
                        description: desc.trim() || undefined,
                        repo_full_name: repo.trim() || undefined,
                        branch_hint: branch.trim() || undefined,
                      })
                    }
                    disabled={!title.trim() || create.isPending}
                  >
                    {create.isPending ? "Creating…" : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Column title={`To Do (${counts.todo})`} hint="Backlog & new items">
            <TaskList
              query={todo}
              onMove={(id, to) => move.mutate({ id, to })}
              onDelete={(id) => del.mutate(id)}
            />
          </Column>

          <Column title={`In Progress (${counts.in_progress})`} hint="Actively being worked">
            <TaskList
              query={inProgress}
              onMove={(id, to) => move.mutate({ id, to })}
              onDelete={(id) => del.mutate(id)}
            />
          </Column>

          <Column title={`Done (${counts.done})`} hint="Completed items">
            <TaskList
              query={done}
              onMove={(id, to) => move.mutate({ id, to })}
              onDelete={(id) => del.mutate(id)}
            />
          </Column>
        </div>
      </main>
    </div>
  );
}

/* ---------------- Hooks & helpers ---------------- */

function useTasksColumn(status: Status) {
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

function useCreateTask(onDone?: () => void) {
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

function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, to }: { id: number; to: Status | "completed" }) =>
      updateTask(id, { status: to }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiDeleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

function useEditTask(onDone?: () => void) {
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

/* ---------------- UI pieces ---------------- */

function Column({
  title, hint, children,
}: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card">
      <div className="flex items-baseline justify-between rounded-t-2xl border-b p-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
      <div className="rounded-b-2xl bg-muted/30 p-3">
        <div className="min-h-[160px] grid gap-3 rounded-xl p-1 ring-1 ring-[--color-ring]/30">
          {children}
        </div>
      </div>
    </section>
  );
}

function TaskList({
  query,
  onMove,
  onDelete,
}: {
  query: { items: Task[]; isLoading: boolean; isError: boolean };
  onMove: (id: number, to: Status | "completed") => void;
  onDelete: (id: number) => void;
}) {
  if (query.isLoading) {
    return (
      <div className="grid gap-3">
        <div className="h-20 animate-pulse rounded-lg bg-muted/40" />
        <div className="h-20 animate-pulse rounded-lg bg-muted/40" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="grid place-items-center rounded-lg border bg-background p-6 text-sm text-destructive">
        Failed to load
      </div>
    );
  }
  if (query.items.length === 0) {
    return (
      <div className="grid place-items-center rounded-lg border border-dashed bg-background p-6 text-sm text-muted-foreground">
        Empty
      </div>
    );
  }
  return (
    <>
      {query.items.map((t) => (
        <EditableTaskCard key={t.id} t={t} onMove={onMove} onDelete={onDelete} />
      ))}
    </>
  );
}

function EditableTaskCard({
  t,
  onMove,
  onDelete,
}: {
  t: Task;
  onMove: (id: number, to: Status | "completed") => void;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [etitle, setETitle] = useState(t.title);
  const [edesc, setEDesc] = useState(t.description ?? "");
  const [erepo, setERepo] = useState(t.repo_full_name ?? "");
  const [ebranch, setEBranch] = useState(t.branch_hint ?? "");

  const [erepoQuery, setERepoQuery] = useState(erepo);
  const [ebranchQuery, setEBranchQuery] = useState(ebranch);

  const repos = useRepoSearch(erepoQuery);
  const branches = useBranchSearch(erepo, ebranchQuery);

  const edit = useEditTask(() => setOpen(false));

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{t.title}</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs">Edit</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit task</DialogTitle>
                <DialogDescription>Update details and GitHub linkage.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Title</label>
                  <Input value={etitle} onChange={(e) => setETitle(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="min-h-[96px] rounded-md border bg-background px-3 py-2 text-sm outline-none ring-[--color-ring] focus:ring-2"
                    value={edesc}
                    onChange={(e) => setEDesc(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Repo full name</label>
                  <Input
                    list="edit-repo-options"
                    placeholder="owner/repo (optional)"
                    value={erepo}
                    onChange={(e) => setERepo(e.target.value)}
                    onInput={(e) => setERepoQuery((e.target as HTMLInputElement).value)}
                  />
                  <datalist id="edit-repo-options">
                    {(repos.data ?? []).map((r) => (
                      <option key={r.full_name} value={r.full_name}>
                        {r.full_name}
                      </option>
                    ))}
                  </datalist>
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Branch hint</label>
                  <Input
                    list="edit-branch-options"
                    placeholder="feature/my-branch (optional)"
                    value={ebranch}
                    onChange={(e) => setEBranch(e.target.value)}
                    onInput={(e) => setEBranchQuery((e.target as HTMLInputElement).value)}
                    disabled={!erepo}
                  />
                  <datalist id="edit-branch-options">
                    {(branches.data ?? []).map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  onClick={() =>
                    edit.mutate({
                      id: t.id,
                      title: etitle.trim() || t.title,
                      description: edesc.trim() || undefined,
                      repo_full_name: erepo.trim() || null,
                      branch_hint: ebranch.trim() || null,
                    })
                  }
                  disabled={edit.isPending || !etitle.trim()}
                >
                  {edit.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {t.description ? (
          <p className="text-sm text-muted-foreground">{t.description}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground">No description</p>
        )}
        <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
          <div><span className="font-medium">Repo:</span> {t.repo_full_name || <em>none</em>}</div>
          <div><span className="font-medium">Branch:</span> {t.branch_hint || <em>none</em>}</div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onMove(t.id, "todo")}
            title="Move to To Do"
          >
            To Do
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs border-primary/40 text-primary"
            onClick={() => onMove(t.id, "in_progress")}
            title="Move to In Progress"
          >
            In&nbsp;Progress
          </Button>
          <Button
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onMove(t.id, "done")}
            title="Move to Done"
          >
            Done
          </Button>
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onDelete(t.id)}
          title="Delete task"
        >
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
