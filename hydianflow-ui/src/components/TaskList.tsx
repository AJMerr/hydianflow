import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { type Status, type Task } from "@/lib/tasks";
import { RepoInput } from "@/components/RepoInput";
import { BranchInput } from "@/components/BranchInput";
import { useEditTask } from "@/lib/tasksHooks";
import type { Member } from "@/lib/members";
import { AssigneeSelect } from "@/components/AssigneeSelect";

export function Column({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
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

export function TaskList({
  query,
  onMove,
  onDelete,
  members,
}: {
  query: { items: Task[]; isLoading: boolean; isError: boolean };
  onMove: (id: number, to: Status | "completed") => void;
  onDelete: (id: number) => void;
  members?: Member[]; // <- added
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
        <EditableTaskCard key={t.id} t={t} onMove={onMove} onDelete={onDelete} members={members} />
      ))}
    </>
  );
}

export function EditableTaskCard({
  t,
  onMove,
  onDelete,
  members,
}: {
  t: Task;
  onMove: (id: number, to: Status | "completed") => void;
  onDelete: (id: number) => void;
  members?: Member[];
}) {
  const [open, setOpen] = useState(false);
  const [etitle, setETitle] = useState(t.title);
  const [edesc, setEDesc] = useState(t.description ?? "");
  const [erepo, setERepo] = useState(t.repo_full_name ?? "");
  const [ebranch, setEBranch] = useState(t.branch_hint ?? "");
  const [eassignee, setEAssignee] = useState<number | null | undefined>(t.assignee_id ?? null);

  const [eRepoConfirmed, setERepoConfirmed] = useState(Boolean(erepo));

  const edit = useEditTask(() => setOpen(false));

  const assigneeName = useMemo(() => {
    if (!members) return t.assignee_id ?? null ? `#${t.assignee_id}` : null;
    const found = members.find((m) => m.id === (t.assignee_id ?? -1));
    return found?.name ?? (t.assignee_id ? `#${t.assignee_id}` : null);
  }, [members, t.assignee_id]);

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

                {/* Assignee */}
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Assignee</label>
                  <AssigneeSelect
                    members={members ?? []}
                    value={eassignee ?? null}
                    onChange={(uid) => setEAssignee(uid)}
                  />
                </div>

                {/* Repo picker */}
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Repo full name</label>
                  <RepoInput
                    value={erepo}
                    onChange={(v) => {
                      setERepo(v);
                      setERepoConfirmed(false);
                      if (v.trim() === "") setEBranch("");
                    }}
                    onConfirm={(full) => {
                      setERepo(full);
                      setERepoConfirmed(true);
                      setEBranch("");
                    }}
                  />
                </div>

                {/* Branch picker */}
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Branch hint</label>
                  <BranchInput
                    repoFullName={erepo}
                    value={ebranch}
                    onChange={(v) => setEBranch(v)}
                    enabled={eRepoConfirmed}
                  />
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
                      assignee_id: eassignee ?? null,
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
          <div><span className="font-medium">Assignee:</span> {assigneeName ?? <em>Unassigned</em>}</div>
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
