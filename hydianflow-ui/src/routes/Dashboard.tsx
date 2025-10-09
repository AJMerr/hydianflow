import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { listProjects, createProject } from "@/lib/projects";
import type { Project } from "@/lib/projects";
import { useTasksColumn } from "@/lib/tasksHooks";
import { bulkGetUsers, type UserLite } from "@/lib/users";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from "recharts";
import { Download } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  todo: "#f59e0b",
  in_progress: "#3b82f6",
  done: "#22c55e",
};
const PIE_COLORS = ["#06b6d4", "#a78bfa", "#f97316", "#84cc16", "#ef4444", "#14b8a6"];

function useChartExport() {
  const exportPNG = (container: HTMLDivElement | null, filename: string) => {
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const canvas = document.createElement("canvas");
    const bbox = svg.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.ceil(bbox.width * dpr);
    canvas.height = Math.ceil(bbox.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(img, 0, 0);
      const a = document.createElement("a");
      a.download = `${filename}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
  };
  return { exportPNG };
}

export default function Dashboard() {
  const todo = useTasksColumn("todo");
  const inprog = useTasksColumn("in_progress");
  const done = useTasksColumn("done");

  const counts = useMemo(
    () => ({
      todo: todo.items.length,
      in_progress: inprog.items.length,
      done: done.items.length,
    }),
    [todo.items.length, inprog.items.length, done.items.length]
  );

  const { data: projects, isLoading: pLoading } = useQuery({ queryKey: ["projects"], queryFn: listProjects });

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

  const totalsData = useMemo(
    () => [
      { status: "To Do", key: "todo", value: counts.todo, color: STATUS_COLORS.todo },
      { status: "In Progress", key: "in_progress", value: counts.in_progress, color: STATUS_COLORS.in_progress },
      { status: "Done", key: "done", value: counts.done, color: STATUS_COLORS.done },
    ],
    [counts.todo, counts.in_progress, counts.done]
  );

  const CHART_MARGINS = { left: 16, right: 16, top: 8, bottom: 28 };
  const Y_AXIS_WIDTH = 32;
  const LEGEND_HEIGHT = 20;

  const assigneeIds = useMemo(
    () =>
      Array.from(
        new Set(
          done.items
            .map((t) => t.assignee_id)
            .filter((v): v is number => typeof v === "number")
        )
      ),
    [done.items]
  );

  const assignees = useQuery({
    queryKey: ["users", assigneeIds],
    queryFn: () => bulkGetUsers(assigneeIds),
    enabled: assigneeIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const assigneeLabel = useMemo(() => {
    const map = new Map<number, string>();
    (assignees.data ?? []).forEach((u: UserLite) => {
      map.set(u.id, u.github_login ? `@${u.github_login}` : u.name);
    });
    return map;
  }, [assignees.data]);

  const completedByAssignee = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of done.items) {
      const label =
        typeof t.assignee_id === "number"
          ? assigneeLabel.get(t.assignee_id) ?? `#${t.assignee_id}`
          : "Unassigned";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [done.items, assigneeLabel]);

  const [projectFilter, setProjectFilter] = useState<"all" | number>("all");

  const statusByProject = useMemo(() => {
    const pid = projectFilter === "all" ? null : projectFilter;

    const tTodo = pid ? todo.items.filter((t) => t.project_id === pid) : todo.items;
    const tProg = pid ? inprog.items.filter((t) => t.project_id === pid) : inprog.items;
    const tDone = pid ? done.items.filter((t) => t.project_id === pid) : done.items;

    const counters = new Map<number, { project: string; todo: number; in_progress: number; done: number }>();

    const bump = (arr: typeof tTodo, key: "todo" | "in_progress" | "done") => {
      for (const t of arr) {
        if (typeof t.project_id !== "number") continue;
        const existing =
          counters.get(t.project_id) ??
          {
            project: projects?.find((p) => p.id === t.project_id)?.name ?? `Project #${t.project_id}`,
            todo: 0,
            in_progress: 0,
            done: 0,
          };
        existing[key] += 1;
        counters.set(t.project_id, existing);
      }
    };

    bump(tTodo, "todo");
    bump(tProg, "in_progress");
    bump(tDone, "done");

    return Array.from(counters.values());
  }, [projectFilter, projects, todo.items, inprog.items, done.items]);

  // bar width tuning
  const totalsBarSize = 56;
  const sbpCount = statusByProject.length;
  const sbpBarSize = sbpCount <= 1 ? 72 : sbpCount <= 2 ? 56 : sbpCount <= 4 ? 40 : 24;
  const sbpCategoryGap = sbpCount <= 2 ? "10%" : sbpCount <= 4 ? "18%" : "28%";

  const totalsRef = useRef<HTMLDivElement | null>(null);
  const assigneesRef = useRef<HTMLDivElement | null>(null);
  const byProjectRef = useRef<HTMLDivElement | null>(null);
  const { exportPNG } = useChartExport();

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-8">
      <div className="mb-2 flex items-center justify-between">
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Kpi label="To Do" value={counts.todo} />
        <Kpi label="In Progress" value={counts.in_progress} />
        <Kpi label="Done" value={counts.done} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Overall Status Totals</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => exportPNG(totalsRef.current, "overall-status")}>
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div ref={totalsRef} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={totalsData}
                  margin={CHART_MARGINS}
                  barGap={6}
                  barCategoryGap="18%"
                >
                  <XAxis dataKey="status" tickLine={false} axisLine={false} interval={0} tickMargin={8} />
                  <YAxis width={Y_AXIS_WIDTH} allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                  <Legend
                    verticalAlign="bottom"
                    height={LEGEND_HEIGHT}
                    content={() => (
                      <ul className="flex justify-center gap-4 text-xs text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: STATUS_COLORS.todo }} />
                          todo
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: STATUS_COLORS.in_progress }} />
                          in_progress
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: STATUS_COLORS.done }} />
                          done
                        </li>
                      </ul>
                    )}
                  />
                  <Bar dataKey="value" barSize={totalsBarSize} radius={[6, 6, 0, 0]}>
                    {totalsData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Completed by Assignee{assignees.isLoading ? " (loading…)" : ""}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => exportPNG(assigneesRef.current, "completed-by-assignee")}>
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div ref={assigneesRef} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie data={completedByAssignee} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {completedByAssignee.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Status by Project</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => exportPNG(byProjectRef.current, "status-by-project")}>
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div ref={byProjectRef} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusByProject}
                  margin={CHART_MARGINS}
                  barGap={6}
                  barCategoryGap={sbpCategoryGap}
                >
                  <XAxis dataKey="project" tickLine={false} axisLine={false} interval={0} tickMargin={8} />
                  <YAxis width={Y_AXIS_WIDTH} allowDecimals={false} tickLine={false} axisLine={false} />
                  <Legend verticalAlign="bottom" height={LEGEND_HEIGHT} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="todo" stackId="a" fill={STATUS_COLORS.todo} barSize={sbpBarSize} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="in_progress" stackId="a" fill={STATUS_COLORS.in_progress} barSize={sbpBarSize} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="done" stackId="a" fill={STATUS_COLORS.done} barSize={sbpBarSize} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>

          <CardFooter className="pt-8">
            <div className="flex items-center">
              <Select
                value={projectFilter === "all" ? "all" : String(projectFilter)}
                onValueChange={(v) => setProjectFilter(v === "all" ? "all" : Number(v))}
              >
                <SelectTrigger className="h-8 w-44">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {(projects ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardFooter>
        </Card>
      </div>

      <Separator />

      <h2 className="text-lg font-semibold">Projects</h2>
      {pLoading ? (
        <div>Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
