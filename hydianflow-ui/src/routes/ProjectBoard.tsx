import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProject } from "../lib/projects";
import { useTasksColumn, useCreateTask } from "../lib/tasksHooks";

export default function ProjectBoard() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { data: project, isLoading: pLoading, isError: pErr } = useQuery({ queryKey: ["project", projectId], queryFn: () => getProject(projectId), enabled: Number.isFinite(projectId) });

  const todo = useTasksColumn("todo", projectId);
  const inprog = useTasksColumn("in_progress", projectId);
  const done = useTasksColumn("done", projectId);

  const createTask = useCreateTask(() => {
    todo.invalidate();
    inprog.invalidate();
    done.invalidate();
  });

  if (!Number.isFinite(projectId)) return <div>Bad project id.</div>;
  if (pLoading) return <div>Loading…</div>;
  if (pErr) return <div>Project not found.</div>;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{project?.name ?? "Project"}</h1>
        <button
          className="rounded-lg border px-3 py-2 hover:bg-slate-50"
          onClick={() => {
            const title = prompt("New task title?");
            if (!title) return;
            createTask.mutate({ title, project_id: projectId });
          }}
        >
          New Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Column title="To Do" items={todo.items} />
        <Column title="In Progress" items={inprog.items} />
        <Column title="Done" items={done.items} />
      </div>
    </div>
  );
}

function Column({ title, items }: { title: string; items: { id: number; title: string }[] }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="font-semibold mb-3">{title}</div>
      <div className="flex flex-col gap-2">
        {items.map(t => (
          <div key={t.id} className="rounded-lg border p-3">{t.title}</div>
        ))}
        {items.length === 0 && <div className="text-slate-500 text-sm">No items.</div>}
      </div>
    </div>
  );
}
