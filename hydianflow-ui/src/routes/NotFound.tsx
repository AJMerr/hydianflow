export default function NotFound() {
  return (
    <main className="min-h-[60vh] grid place-items-center text-center">
      <div>
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="mt-2 text-muted-foreground">Try the board instead.</p>
        <a href="/app" className="inline-block mt-4 underline">Go to App</a>
      </div>
    </main>
  );
}
