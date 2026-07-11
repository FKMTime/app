import {
  ActivityIcon,
  CommandIcon,
  HomeIcon,
  ListChecksIcon,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { AdminModePill } from "@/components/protected/admin-mode-pill";
import { Header } from "@/components/protected/header";
import { Main } from "@/components/protected/main";
import { ProfileDropdown } from "@/components/protected/profile-dropdown";
import { TopNav } from "@/components/protected/top-nav";
import { requireAdmin } from "@/lib/authz";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="min-h-svh border-t-4 border-rose-500 dark:border-rose-600">
      <Header>
        <TopNav links={topNav} />
        <div className="ml-auto flex items-center gap-3">
          <AdminModePill variant="strong" />
          <ModeToggle />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>{children}</Main>
    </div>
  );
}

const topNav = [
  {
    icon: <HomeIcon size={16} />,
    title: "Dashboard",
    href: "/dashboard",
  },
  {
    icon: <ListChecksIcon size={16} />,
    title: "Requests",
    href: "/admin/requests",
  },
  {
    icon: <CommandIcon size={16} />,
    title: "Competitions",
    href: "/admin/competitions",
  },
  {
    icon: <ActivityIcon size={16} />,
    title: "Sync health",
    href: "/admin/health",
  },
];
