import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, GitBranch, GitPullRequest, Kanban, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen text-white"
      style={{
        // Neutral dark-first background with subtle purple glow accents
        background: `radial-gradient(1200px 600px at 15% -10%, rgba(135,113,166,0.16), transparent 60%),
                     radial-gradient(900px 420px at 90% 8%, rgba(122,37,141,0.10), transparent 60%),
                     linear-gradient(180deg, #0b0b14 0%, #0b0b14 40%, #0e1116 100%)`,
      }}
    >
      {/* Navbar */}
      <header
        className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-black/30 border-b"
        style={{ borderColor: "#8771a633" }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-xl grid place-items-center"
              style={{ backgroundColor: "#7a258d22", color: "#dfc0e9" }}
            >
              <Kanban className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight" style={{ color: "#dfc0e9" }}>
              HydianFlow
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a className="hover:opacity-100 opacity-80" href="#how" style={{ color: "#dfc0e9" }}>
              How it works
            </a>
            <a className="hover:opacity-100 opacity-80" href="#features" style={{ color: "#dfc0e9" }}>
              Features
            </a>
            <a className="hover:opacity-100 opacity-80" href="#faq" style={{ color: "#dfc0e9" }}>
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hover:opacity-100 opacity-90" style={{ color: "#dfc0e9" }}>
              <a href="https://github.com/AJMerr/hydianflow" target="_blank" rel="noreferrer">
                GitHub
              </a>
            </Button>
            <Button
              asChild
              className="inline-flex items-center border"
              style={{
                backgroundColor: "#7a258d",
                borderColor: "#8771a6",
                color: "#dfc0e9",
              }}
            >
              <a href="/app" className="inline-flex items-center">
                Open App <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          {/* softer, more neutral glow */}
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 h-[38rem] w-[38rem] rounded-full blur-3xl"
            style={{ background: "radial-gradient(closest-side, rgba(135,113,166,0.20), transparent 70%)" }}
          />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-28">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1
                className="text-4xl sm:text-5xl/tight font-semibold tracking-tight"
                style={{ color: "#dfc0e9" }}
              >
                Kanban that <span style={{ color: "#7a258d" }}>moves itself</span> with GitHub
              </h1>
              <p className="mt-4 max-w-xl" style={{ color: "#8771a6" }}>
                HydianFlow watches your repo activity and automatically advances tasks across the board.
                Push/PR-aware automation built in.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="/app"
                  className="inline-flex items-center rounded-md px-5 py-2.5 text-sm font-medium border"
                  style={{
                    backgroundColor: "#7a258d",
                    borderColor: "#8771a6",
                    color: "#dfc0e9",
                  }}
                >
                  Try the Board <ArrowRight className="ml-2 h-4 w-4" />
                </a>
                <a
                  href="#how"
                  className="inline-flex items-center rounded-md px-5 py-2.5 text-sm font-medium border"
                  style={{
                    borderColor: "#8771a6",
                    color: "#dfc0e9",
                  }}
                >
                  See how it works
                </a>
              </div>
              <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  "Push to default branch → Done",
                  "Non-default push → In Progress",
                  "PR merged → Done",
                  "Commit message #123 links",
                ].map((txt) => (
                  <li key={txt} className="flex items-center gap-2" style={{ color: "#dfc0e9" }}>
                    <CheckCircle2 className="h-4 w-4" style={{ color: "#fada16" }} />
                    <span className="opacity-90">{txt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Glass card */}
            <div className="relative">
              <div
                className="rounded-2xl border bg-clip-padding backdrop-blur p-6 shadow-sm"
                style={{
                  borderColor: "#8771a655",
                  background: "linear-gradient(180deg, rgba(12,14,18,0.65) 0%, rgba(12,14,18,0.45) 100%)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl grid place-items-center"
                    style={{ backgroundColor: "#7a258d22", color: "#dfc0e9" }}
                  >
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: "#dfc0e9" }}>
                      feature/auth-ui
                    </div>
                    <div className="text-xs" style={{ color: "#8771a6" }}>
                      hydianflow • repo
                    </div>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  <Row icon={<Zap className="h-4 w-4" />} label="Push (non-default)" value="Todo → In Progress" />
                  <Row icon={<GitPullRequest className="h-4 w-4" />} label="PR merged" value="In Progress → Done" />
                  <Row icon={<Kanban className="h-4 w-4" />} label="Commit '#123'" value="Completes Task #123" />
                </div>
                <div className="mt-6 text-xs" style={{ color: "#8771a6" }}>
                  Prefix match:{" "}
                  <code
                    className="rounded px-1"
                    style={{ backgroundColor: "#11131a", color: "#dfc0e9", border: "1px solid #8771a633" }}
                  >
                    feature
                  </code>
                  ,{" "}
                  <code
                    className="rounded px-1"
                    style={{ backgroundColor: "#11131a", color: "#dfc0e9", border: "1px solid #8771a633" }}
                  >
                    feature/auth
                  </code>
                  ,{" "}
                  <code
                    className="rounded px-1"
                    style={{ backgroundColor: "#11131a", color: "#dfc0e9", border: "1px solid #8771a633" }}
                  >
                    feature/auth-ui
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-16 border-t" style={{ borderColor: "#8771a633" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight" style={{ color: "#dfc0e9" }}>
            How it works
          </h2>
          <p className="mt-2 max-w-2xl" style={{ color: "#8771a6" }}>
            HydianFlow ingests GitHub webhooks, verifies HMAC, dedupes by delivery id, and performs bulk updates
            against indexed Postgres tables.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card icon={<GitBranch />} title="Push-aware" desc="Default vs non-default branch rules move tasks automatically." />
            <Card icon={<GitPullRequest />} title="PR-smart" desc="Merged into default branch completes the related work." />
            <Card icon={<Kanban />} title="Kanban-first" desc="A11y-friendly board with smart repo/branch pickers." />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t" style={{ borderColor: "#8771a633" }}>
        <div
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm"
          style={{ color: "#8771a6" }}
        >
          <span>© {new Date().getFullYear()} HydianFlow</span>
          <div className="flex items-center gap-6">
            <a href="/app" className="hover:opacity-100 opacity-90" style={{ color: "#dfc0e9" }}>
              Open App
            </a>
            <a
              href="https://github.com/AJMerr/hydianflow"
              target="_blank"
              className="hover:opacity-100 opacity-90"
              style={{ color: "#dfc0e9" }}
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Card({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div
      className="rounded-2xl border p-5 hover:shadow-sm transition-shadow"
      style={{
        borderColor: "#8771a655",
        background: "linear-gradient(180deg, rgba(21,23,29,0.24) 0%, rgba(21,23,29,0.10) 100%)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-lg grid place-items-center"
          style={{ backgroundColor: "#7a258d22", color: "#dfc0e9" }}
        >
          {icon}
        </div>
        <div className="font-medium" style={{ color: "#dfc0e9" }}>
          {title}
        </div>
      </div>
      <p className="mt-3 text-sm" style={{ color: "#8771a6" }}>
        {desc}
      </p>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between rounded-xl px-3 py-2 border"
      style={{
        borderColor: "#8771a655",
        background: "linear-gradient(180deg, rgba(23,26,33,0.35) 0%, rgba(23,26,33,0.20) 100%)",
      }}
    >
      <div className="flex items-center gap-2 text-sm" style={{ color: "#dfc0e9" }}>
        <span style={{ color: "#fada16" }}>{icon}</span>
        <span>{label}</span>
      </div>
      <span
        className="text-xs rounded px-2 py-1 border"
        style={{
          backgroundColor: "#0b0b14",
          color: "#dfc0e9",
          borderColor: "#8771a655",
        }}
      >
        {value}
      </span>
    </div>
  );
}
