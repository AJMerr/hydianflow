// src/App.tsx
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";

type Status = "todo" | "in_progress" | "done";
type Task = {
  id: number;
  title: string;
  description?: string;
  status: Status;
  createdAt: string;
};

const initialTasks: Task[] = [
  { id: 1, title: "Scaffold API routes", description: "healthz + /api/v1", status: "todo", createdAt: new Date().toISOString() },
  { id: 2, title: "DB connection & migrations", description: "gorm + migrate up", status: "in_progress", createdAt: new Date().toISOString() },
  { id: 3, title: "CRUD: tasks", description: "create/list/get/patch/delete", status: "done", createdAt: new Date().toISOString() },
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const counts = useMemo(
    () => ({
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      done: tasks.filter((t) => t.status === "done").length,
    }),
    [tasks]
  );

  function addTask() {
    if (!title.trim()) return;
    const next: Task = {
      id: tasks.length ? Math.max(...tasks.map((t) => t.id)) + 1 : 1,
      title: title.trim(),
      description: desc.trim() || undefined,
      status: "todo",
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [next, ...prev]);
    setTitle("");
    setDesc("");
    setOpen(false);
  }

  function moveTask(id: number, status: Status) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  function deleteTask(id: number) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-baseline gap-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-semibold">
              HF
            </span>
            <h1 className="text-xl font-semibold tracking-tight">Hydianflow</h1>
            <span className="text-xs text-muted-foreground">Kanban (mock)</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary text-primary-foreground hover:opacity-90">
                  New Task
                </Button>
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
                  <Button onClick={addTask} disabled={!title.trim()}>
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Column
            title={`To Do (${counts.todo})`}
            hint="Backlog & new items"
          >
            <TaskList
              tasks={tasks.filter((t) => t.status === "todo")}
              onMove={(id, to) => moveTask(id, to)}
              onDelete={(id) => deleteTask(id)}
            />
          </Column>

          <Column
            title={`In Progress (${counts.in_progress})`}
            hint="Actively being worked"
          >
            <TaskList
              tasks={tasks.filter((t) => t.status === "in_progress")}
              onMove={(id, to) => moveTask(id, to)}
              onDelete={(id) => deleteTask(id)}
            />
          </Column>

          <Column
            title={`Done (${counts.done})`}
            hint="Completed items"
          >
            <TaskList
              tasks={tasks.filter((t) => t.status === "done")}
              onMove={(id, to) => moveTask(id, to)}
              onDelete={(id) => deleteTask(id)}
            />
          </Column>
        </div>
      </main>
    </div>
  );
}

function Column({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
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
  tasks,
  onMove,
  onDelete,
}: {
  tasks: Task[];
  onMove: (id: number, to: Status) => void;
  onDelete: (id: number) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="grid place-items-center rounded-lg border border-dashed bg-background p-6 text-sm text-muted-foreground">
        Empty
      </div>
    );
  }
  return (
    <>
      {tasks.map((t) => (
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
                variant="default"
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
