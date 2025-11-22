import type { PropsWithChildren } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const queryClient = new QueryClient();

type Me = { id: number; name: string; github_login?: string; avatar_url?: string };

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate />
    </QueryClientProvider>
  );
}

function AuthGate() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<Me>("/api/v1/auth/me"),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const logout = useMutation({
    mutationFn: () => api.post<void>("/api/v1/auth/logout"),
    onSuccess: async () => {
      await qc.clear();
      toast.success("Signed out");
      navigate("/", { replace: true });
    },
    onError: (err: unknown) => {
      toast.error("Sign out failed", { description: String((err as any)?.message || err) });
    },
  });

  if (me.isLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-transparent" />
      </div>
    );
  }

  if (me.isError) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="grid gap-4 text-center">
          <h1 className="text-xl font-semibold">HydianFlow</h1>
          <a href="/api/v1/auth/github/start?next=/app&prompt=consent" className="inline-block">
            <Button>Sign in with GitHub</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <AppShell userName={me.data!.name} onLogout={() => logout.mutate()}>
      <Outlet /> {/* Dashboard / ProjectBoard render here */}
    </AppShell>
  );
}

function AppShell({ userName, onLogout, children }: PropsWithChildren<{ userName: string; onLogout: () => void }>) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-baseline gap-3">
            <Link to="/app" className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-semibold">
              HF
            </Link>
            <Link to="/app" className="text-xl font-semibold tracking-tight">HydianFlow</Link>
            <nav className="ml-3 flex items-center gap-3 text-sm text-muted-foreground">
              <Link to="/app" className="hover:underline">Dashboard</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Hi, {userName}</span>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={onLogout}>Logout</Button>
          </div>
        </div>
      </header>
      <main className="w-full px-2 sm:px-4 lg:px-6 py-6">{children}</main>
    </div>
  );
}
