import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Column, TaskList } from "@/components/TaskList";
import { BranchInput } from "@/components/BranchInput";
import { RepoInput } from "@/components/RepoInput";
import { useCreateTask, useDeleteTask, useTasksColumn } from "@/lib/tasksHooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProject, listProjects, type Project } from "@/lib/projects";
import { updateTask, type Status, type Task } from "@/lib/tasks";
import { AssigneeSelect } from "@/components/AssigneeSelect";
import { listProjectMembers, type Member } from "@/lib/members";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ProjectBoard() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: Number.isFinite(projectId)
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
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
  const [etag, setEtag] = useState<"feature" | "feature_request" | "issue" | "">("");

  const create = useCreateTask(() => {
    setOpen(false);
    setTitle("");
    setDesc("");
    setRepo("");
    setBranch("");
    setRepoConfirmed(false);
    setAssignee(null);
    setEtag("");
    todo.invalidate?.(); inProgress.invalidate?.(); done.invalidate?.();
  });

  const del = useDeleteTask();

  if (!Number.isFinite(projectId)) {
    return <div className="text-red-600">Bad project id.</div>;
  }

  const qc = useQueryClient();

  const readItems = (s: Status) =>
    (s === "todo" ? todo.items : s === "in_progress" ? inProgress.items : done.items);

  const keyFor = (s: Status) => ["tasks", (Number.isFinite(projectId) ? projectId : "global"), s] as const;

  const moveReorder = useMutation({
    mutationFn: (p: { id: number; status?: Status; position: number }) =>
      updateTask(p.id, { status: p.status, position: p.position }),
  });

  function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const id = Number(draggableId.replace("task-", ""));
    const srcKey = source.droppableId as Status;
    const dstKey = destination.droppableId as Status;

    const srcKeyQ = keyFor(srcKey);
    const dstKeyQ = keyFor(dstKey);

    const prevSrc = qc.getQueryData<any>(srcKeyQ);
    const prevDst = qc.getQueryData<any>(dstKeyQ);

    const srcItems = [...readItems(srcKey)];
    const [moved] = srcItems.splice(source.index, 1);

    const sameColumn = srcKey === dstKey;
    const dstItems = sameColumn ? [...srcItems] : [...readItems(dstKey)];

    const insertAt = destination.index;

    const optimisticMoved = { ...moved, status: dstKey };
    dstItems.splice(insertAt, 0, optimisticMoved);

    const setItems = (key: readonly unknown[], items: Task[]) => {
      qc.setQueryData(key, (old: any) => ({ ...(old ?? {}), items }));
    };

    if (sameColumn) {
      setItems(srcKeyQ, dstItems);
    } else {
      setItems(srcKeyQ, srcItems);
      setItems(dstKeyQ, dstItems);
    }

    let pos: number;
    const lastIdx = dstItems.length - 1;

    if (insertAt === 0) {
      const next = dstItems[1]?.position ?? 0;
      pos = next - 1000;
    } else if (insertAt === lastIdx) {
      const prev = dstItems[lastIdx - 1]?.position ?? 0;
      pos = prev + 1000;
    } else {
      const prev = dstItems[insertAt - 1]?.position ?? 0;
      const next = dstItems[insertAt + 1]?.position ?? prev + 2000;
      pos = next <= prev ? prev + 1 : (prev + next) / 2;
    }

    moveReorder.mutate(
      { id, status: sameColumn ? undefined : dstKey, position: pos },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: srcKeyQ });
          if (!sameColumn) qc.invalidateQueries({ queryKey: dstKeyQ });
        },
        onError: () => {
          qc.setQueryData(srcKeyQ, prevSrc);
          if (!sameColumn) qc.setQueryData(dstKeyQ, prevDst);
        },
      }
    );
  }

  if (project.isLoading) {
    return <div className="text-muted-foreground">Loading…</div>;
  }

  if (!project.data) {
    return <div className="text-red-600">Project not found.</div>;
  }

  if (project.data.has_children) {
    const children = (allProjects as Project[]).filter(
      (p) => p.parent_id === project.data!.id
    );

    return (
      <div className="mx-auto max-w-5xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{project.data.name}</h1>
            {project.data.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {project.data.description}
              </p>
            )}
          </div>
        </div>

        <h2 className="text-lg font-semibold mt-4">Boards</h2>
        {children.length === 0 ? (
          <div className="text-muted-foreground">
            No boards under this project yet.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mt-2">
            {children.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border p-4 hover:bg-accent/40"
              >
                <div className="min-w-0">
                  <Link
                    to={`/app/projects/${p.id}`}
                    className="font-medium hover:underline"
                  >
                    {p.name}
                  </Link>
                  {p.description && (
                    <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {p.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] w-full px-2 sm:px-4 lg:px-6">
      <div className="mx-auto w-full max-w-6xl xl:max-w-7xl">
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

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Tag</label>
                  <select
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                    value={etag}
                    onChange={(e) => setEtag(e.target.value as any)}
                  >
                    <option value="">None</option>
                    <option value="feature">Feature</option>
                    <option value="feature_request">Feature Request</option>
                    <option value="issue">Issue</option>
                  </select>
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
                        tag: etag ? etag : undefined,
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

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid gap-4 md:grid-cols-3">
            <Column title={`To Do (${counts.todo})`} hint="Backlog & new items">
              <ScrollArea className="mt-2 h-[70vh] pr-1">
                <TaskList droppableId="todo" query={todo} onDelete={(id) => del.mutate(id)} members={members} />
              </ScrollArea>
            </Column>
            <Column title={`In Progress (${counts.in_progress})`} hint="Actively being worked">
              <ScrollArea className="mt-2 h-[70vh] pr-1">
                <TaskList droppableId="in_progress" query={inProgress} onDelete={(id) => del.mutate(id)} members={members} />
              </ScrollArea>
            </Column>
            <Column title={`Done (${counts.done})`} hint="Completed items">
              <ScrollArea className="mt-2 h-[70vh] pr-1">
                <TaskList droppableId="done" query={done} onDelete={(id) => del.mutate(id)} members={members} />
              </ScrollArea>
            </Column>
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
