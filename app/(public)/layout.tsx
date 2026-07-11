import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, LogIn, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";

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
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <Image
              src="/logo.svg"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7"
              priority
            />
            <span className="hidden sm:inline">FKMTime</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {session?.user?.isAdmin && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
                title="You are signed in as an admin"
              >
                <ShieldCheck className="h-3 w-3" aria-hidden />
                Admin
              </span>
            )}
            <ModeToggle />
            {session ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard" className="inline-flex items-center gap-1">
                  <LayoutDashboard className="h-4 w-4" aria-hidden />
                  <span>Dashboard</span>
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href="/" className="inline-flex items-center gap-1">
                  <LogIn className="h-4 w-4" aria-hidden />
                  <span>Sign in</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
