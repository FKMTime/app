import Link from "next/link";
import { auth } from "@/auth";
import { ModeToggle } from "@/components/mode-toggle";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            FKMTime
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ModeToggle />
            {session ? (
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-primary hover:bg-muted"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-primary hover:bg-muted"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
