import { useMemo, useState } from "react";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Column, TaskList } from "@/components/TaskList";
import { BranchInput } from "@/components/BranchInput";
import { RepoInput } from "@/components/RepoInput";
import { useCreateTask, useDeleteTask, useMoveTask, useTasksColumn } from "@/lib/tasksHooks";

const queryClient = new QueryClient();

type Me = { id: number; name: string; github_login?: string; avatar_url?: string };


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

  // NEW: repo must be confirmed (selected) before branches will load
  const [repoConfirmed, setRepoConfirmed] = useState(false);

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
    setRepoConfirmed(false);
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

                  {/* Repo picker (custom panel) */}
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium">Repo full name</label>
                    <RepoInput
                      value={repo}
                      onChange={(v) => {
                        setRepo(v);
                        setRepoConfirmed(false);
                        if (v.trim() === "") {
                          setBranch("");
                        }
                      }}
                      onConfirm={(full) => {
                        setRepo(full);
                        setRepoConfirmed(true);
                        setBranch("");
                      }}
                    />
                  </div>

                  {/* Branch picker (custom panel) */}
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium">Branch hint</label>
                    <BranchInput
                      repoFullName={repo}
                      value={branch}
                      onChange={(v) => {
                        setBranch(v);
                      }}
                      enabled={repoConfirmed}
                    />
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

