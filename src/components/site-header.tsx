import Link from "next/link";

// Shared top bar for the in-app pages (dashboard, admin) so they match the
// landing page's branding. Logo only — no wordmark — to mirror the hero nav.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          aria-label="Hotdogify home"
          className="inline-flex items-center text-xl leading-none"
        >
          🌭
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/#demo" className="transition-colors hover:text-foreground">
            Demo
          </Link>
          <Link href="/dashboard" className="transition-colors hover:text-foreground">
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
