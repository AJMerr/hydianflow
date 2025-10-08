import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import { Column, TaskList } from "@/components/TaskList";
import { BranchInput } from "@/components/BranchInput";
import { RepoInput } from "@/components/RepoInput";
import { useCreateTask, useDeleteTask, useMoveTask, useTasksColumn } from "@/lib/tasksHooks";
import { useQuery } from "@tanstack/react-query";
import { getProject } from "@/lib/projects";

import { AssigneeSelect } from "@/components/AssigneeSelect";
import { listProjectMembers, type Member } from "@/lib/members";

export default function ProjectBoard() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: Number.isFinite(projectId)
  });

  const { data: members = [] } = useQuery({
    queryKey: ["project", projectId, "members"],
    queryFn: () => listProjectMembers(projectId),
    enabled: Number.isFinite(projectId),
  });

  const todo = useTasksColumn("todo", projectId);
  const inProgress = useTasksColumn("in_progress", projectId);
  const done = useTasksColumn("done", projectId);

  const counts = useMemo(
    () => ({
      todo: todo.items.length,
      in_progress: inProgress.items.length,
      done: done.items.length,
    }),
    [todo.items.length, inProgress.items.length, done.items.length]
  );

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("");
  const [repoConfirmed, setRepoConfirmed] = useState(false);
  const [assignee, setAssignee] = useState<number | null>(null);

  const create = useCreateTask(() => {
    setOpen(false);
    setTitle("");
    setDesc("");
    setRepo("");
    setBranch("");
    setRepoConfirmed(false);
    setAssignee(null);
    todo.invalidate?.();
    inProgress.invalidate?.();
    done.invalidate?.();
  });

  const move = useMoveTask();
  const del = useDeleteTask();

  if (!Number.isFinite(projectId)) {
    return <div className="text-red-600">Bad project id.</div>;
  }

  return (
    <div className="min-h-[60vh]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold tracking-tight">
            {project.isLoading ? "Loading…" : (project.data?.name ?? "Project")}
          </h1>
          {project.data?.description && (
            <span className="text-xs text-muted-foreground">{project.data.description}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
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
                  <label className="text-sm font-medium">Assignee</label>
                  <AssigneeSelect
                    members={members as Member[]}
                    value={assignee}
                    onChange={(uid) => setAssignee(uid)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Repo full name</label>
                  <RepoInput
                    value={repo}
                    onChange={(v) => {
                      setRepo(v);
                      setRepoConfirmed(false);
                      if (v.trim() === "") setBranch("");
                    }}
                    onConfirm={(full) => {
                      setRepo(full);
                      setRepoConfirmed(true);
                      setBranch("");
                    }}
                  />
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Branch hint</label>
                  <BranchInput
                    repoFullName={repo}
                    value={branch}
                    onChange={(v) => setBranch(v)}
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
                      project_id: projectId,
                      assignee_id: assignee ?? null,
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

      <div className="grid gap-4 md:grid-cols-3">
        <Column title={`To Do (${counts.todo})`} hint="Backlog & new items">
          <TaskList
            query={todo}
            onMove={(id, to) => move.mutate({ id, to })}
            onDelete={(id) => del.mutate(id)}
            members={members}
          />
        </Column>

        <Column title={`In Progress (${counts.in_progress})`} hint="Actively being worked">
          <TaskList
            query={inProgress}
            onMove={(id, to) => move.mutate({ id, to })}
            onDelete={(id) => del.mutate(id)}
            members={members}
          />
        </Column>

        <Column title={`Done (${counts.done})`} hint="Completed items">
          <TaskList
            query={done}
            onMove={(id, to) => move.mutate({ id, to })}
            onDelete={(id) => del.mutate(id)}
            members={members}
          />
        </Column>
      </div>
    </div>
  );
}
