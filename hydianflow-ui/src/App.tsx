import { useEffect, useMemo, useState } from "react";
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

export default function App() {
  useEffect(() => {
    api.setBaseURL(import.meta.env.VITE_API_BASE_URL ?? "");
    api.setWithCredentials(true);
  }, []);

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
    refetchOnWindowFocus: true,
  });

  const logout = useMutation({
    mutationFn: () => api.post<void>("/api/v1/auth/logout"),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["me"] });
      await qc.invalidateQueries({ queryKey: ["tasks"] });
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
          <h1 className="text-xl font-semibold">Hydianflow</h1>
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

function Board({ onLogout, user }: { onLogout: () => void; user: Me }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

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
            <h1 className="text-xl font-semibold tracking-tight">Hydianflow</h1>
            <span className="text-xs text-muted-foreground">Kanban</span>
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
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => create.mutate({ title: title.trim(), description: desc.trim() || undefined })}
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
  const me = useQuery<Me>({ queryKey: ["me"], queryFn: () => api.get<Me>("/api/v1/auth/me") });
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
    mutationFn: (body: { title: string; description?: string }) => createTask(body),
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
        <Card key={t.id} className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t.title}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {t.description ? (
              <p className="text-sm text-muted-foreground">{t.description}</p>
            ) : (
              <p className="text-sm italic text-muted-foreground">No description</p>
            )}
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
      ))}
    </>
  );
}
