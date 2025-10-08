import { useQuery } from "@tanstack/react-query";
import { listProjects, type Project } from "../lib/projects";
import { useTasksColumn } from "../lib/tasksHooks";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { data: projects, isLoading: pLoading } = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const todo = useTasksColumn("todo");
  const inprog = useTasksColumn("in_progress");
  const done = useTasksColumn("done");

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      {/* Simple KPI row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Kpi label="To Do" value={todo.items.length} />
        <Kpi label="In Progress" value={inprog.items.length} />
        <Kpi label="Done" value={done.items.length} />
      </div>

      <h2 className="text-lg font-semibold mb-2">Projects</h2>
      {pLoading ? <div>Loading…</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(projects ?? []).map((p: Project) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="rounded-xl border p-4 hover:bg-slate-50">
              <div className="font-medium">{p.name}</div>
              {p.description && <div className="text-sm text-slate-600 mt-1">{p.description}</div>}
            </Link>
          ))}
          {(projects ?? []).length === 0 && <div className="text-slate-600">No projects yet.</div>}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
