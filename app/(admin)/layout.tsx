import { CommandIcon, HomeIcon, ListChecksIcon } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
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
    <>
      <Header>
        <TopNav links={topNav} />
        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>{children}</Main>
    </>
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
];
