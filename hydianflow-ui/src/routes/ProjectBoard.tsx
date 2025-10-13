import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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
import { getProject } from "@/lib/projects";
import { updateTask, type Status, type Task } from "@/lib/tasks";
import { AssigneeSelect } from "@/components/AssigneeSelect";
import { listProjectMembers, type Member } from "@/lib/members";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";

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
    todo.invalidate?.(); inProgress.invalidate?.(); done.invalidate?.();
  });

  const del = useDeleteTask();

  if (!Number.isFinite(projectId)) {
    return <div className="text-red-600">Bad project id.</div>;
  }

  const qc = useQueryClient();

  type TasksCache = { items: Task[] } & Record<string, unknown>;
  const arrKey = (s: Status) => ["tasks", s, projectId] as const;
  const objKey = (s: Status) => ["tasks", { status: s, project_id: projectId }] as const;

  const getLiveItems = (s: Status) =>
    (s === "todo" ? todo.items : s === "in_progress" ? inProgress.items : done.items);

  const readItems = (s: Status): Task[] => {
    const a = qc.getQueryData<TasksCache>(arrKey(s));
    if (a && Array.isArray(a.items)) return a.items;
    const b = qc.getQueryData<TasksCache>(objKey(s));
    if (b && Array.isArray(b.items)) return b.items;
    return getLiveItems(s);
  };

  const writeItems = (s: Status, items: Task[]) => {
    qc.setQueryData<TasksCache | undefined>(arrKey(s), (old) => (old ? { ...old, items } : old));
    qc.setQueryData<TasksCache | undefined>(objKey(s), (old) => (old ? { ...old, items } : old));
  };

  const invalidateAndRefetch = (s: Status) => {
    qc.invalidateQueries({ queryKey: arrKey(s) });
    qc.invalidateQueries({ queryKey: objKey(s) });
    qc.refetchQueries({ queryKey: arrKey(s), type: "active" });
    qc.refetchQueries({ queryKey: objKey(s), type: "active" });
  };

  function calcPosition(list: Task[], destIndex: number): number {
    const before = list[destIndex - 1]?.position;
    const after = list[destIndex]?.position;
    if (before == null && after == null) return 1000;
    if (before == null) return (0 + (after ?? 1000)) / 2;
    if (after == null) return before + 1000;
    return (before + after) / 2;
  }

  type MoveVars = {
    id: number;
    src: Status;
    dst: Status;
    sourceIndex: number;
    destIndex: number;
    position: number;
  };

  const moveReorder = useMutation({
    mutationFn: (v: MoveVars) =>
      updateTask(v.id, {
        status: v.src === v.dst ? undefined : v.dst,
        position: v.position,
      }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: arrKey(v.src) });
      await qc.cancelQueries({ queryKey: arrKey(v.dst) });

      const prevSrc = qc.getQueryData<TasksCache>(arrKey(v.src)) ?? qc.getQueryData<TasksCache>(objKey(v.src));
      const prevDst = qc.getQueryData<TasksCache>(arrKey(v.dst)) ?? qc.getQueryData<TasksCache>(objKey(v.dst));

      const srcItems = readItems(v.src).slice();
      const [moved] = srcItems.splice(v.sourceIndex, 1);

      const dstItems = v.src === v.dst ? srcItems : readItems(v.dst).slice();
      dstItems.splice(v.destIndex, 0, { ...moved, status: v.dst });

      writeItems(v.src, v.src === v.dst ? dstItems : srcItems);
      if (v.src !== v.dst) writeItems(v.dst, dstItems);

      return { prevSrc, prevDst };
    },
    onError: (_e, v, ctx) => {
      if (!ctx) return;
      if (ctx.prevSrc) {
        qc.setQueryData(arrKey(v.src), ctx.prevSrc);
        qc.setQueryData(objKey(v.src), ctx.prevSrc);
      }
      if (v.src !== v.dst && ctx.prevDst) {
        qc.setQueryData(arrKey(v.dst), ctx.prevDst);
        qc.setQueryData(objKey(v.dst), ctx.prevDst);
      }
    },
    onSettled: (_d, _e, v) => {
      invalidateAndRefetch(v.src);
      if (v.src !== v.dst) invalidateAndRefetch(v.dst);
    },
  });

  function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const id = Number(draggableId.replace("task-", ""));
    const src = source.droppableId as Status;
    const dst = destination.droppableId as Status;

    const base = readItems(src).slice();
    const [moved] = base.splice(source.index, 1);
    const preview = dst === src ? base.slice() : readItems(dst).slice();
    preview.splice(destination.index, 0, { ...moved, status: dst });

    const position = calcPosition(preview, destination.index);

    moveReorder.mutate({
      id,
      src,
      dst,
      sourceIndex: source.index,
      destIndex: destination.index,
      position,
    });
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

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid gap-4 md:grid-cols-3">
          <Column title={`To Do (${counts.todo})`} hint="Backlog & new items">
            <TaskList droppableId="todo" query={todo} onDelete={(id) => del.mutate(id)} members={members} />
          </Column>
          <Column title={`In Progress (${counts.in_progress})`} hint="Actively being worked">
            <TaskList droppableId="in_progress" query={inProgress} onDelete={(id) => del.mutate(id)} members={members} />
          </Column>
          <Column title={`Done (${counts.done})`} hint="Completed items">
            <TaskList droppableId="done" query={done} onDelete={(id) => del.mutate(id)} members={members} />
          </Column>
        </div>
      </DragDropContext>
    </div>
  );
}
