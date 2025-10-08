import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { listProjects, createProject } from "@/lib/projects";
import type { Project } from "@/lib/projects";
import { useTasksColumn } from "@/lib/tasksHooks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Dashboard() {
  const todo = useTasksColumn("todo");
  const inprog = useTasksColumn("in_progress");
  const done = useTasksColumn("done");
  const counts = useMemo(
    () => ({ todo: todo.items.length, in_progress: inprog.items.length, done: done.items.length }),
    [todo.items.length, inprog.items.length, done.items.length]
  );

  // Projects list
  const { data: projects, isLoading: pLoading } = useQuery({ queryKey: ["projects"], queryFn: listProjects });

  // Create project modal state
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const create = useMutation({
    mutationFn: () => createProject({ name: name.trim(), description: desc.trim() || undefined }),
    onSuccess: (p) => {
      toast.success("Project created");
      setOpen(false);
      setName("");
      setDesc("");
      qc.invalidateQueries({ queryKey: ["projects"] });
      navigate(`/app/projects/${p.id}`, { replace: true });
    },
    onError: (e: any) => {
      toast.error("Failed to create project", { description: e?.message ?? String(e) });
    },
  });

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>Spin up a dedicated Kanban board for this project.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HydianFlow Core" />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="min-h-[96px] rounded-md border bg-background px-3 py-2 text-sm outline-none ring-[--color-ring] focus:ring-2"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Optional details…"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
                {create.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Kpi label="To Do" value={counts.todo} />
        <Kpi label="In Progress" value={counts.in_progress} />
        <Kpi label="Done" value={counts.done} />
      </div>

      <h2 className="text-lg font-semibold mb-2">Projects</h2>
      {pLoading ? (
        <div>Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(projects ?? []).map((p: Project) => (
            <Link
              key={p.id}
              to={`projects/${p.id}`}
              className="rounded-xl border p-4 hover:bg-accent/40"
            >
              <div className="font-medium">{p.name}</div>
              {p.description && <div className="text-sm text-muted-foreground mt-1">{p.description}</div>}
            </Link>
          ))}
          {(projects ?? []).length === 0 && <div className="text-muted-foreground">No projects yet.</div>}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
