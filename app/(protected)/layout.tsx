import { auth } from "@/auth";
import { ModeToggle } from "@/components/mode-toggle";
import { AdminModePill } from "@/components/protected/admin-mode-pill";
import { Header } from "@/components/protected/header";
import { Main } from "@/components/protected/main";
import { ProfileDropdown } from "@/components/protected/profile-dropdown";
import { TopNav } from "@/components/protected/top-nav";
import { CommandIcon, HomeIcon, ShieldIcon } from "lucide-react";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const topNav = [
    {
      icon: <HomeIcon size={16} />,
      title: "Home",
      href: "/dashboard",
    },
    {
      icon: <CommandIcon size={16} />,
      title: "Request a competition",
      href: "/dashboard/competitions",
    },
    ...(session.user.isAdmin
      ? [
          {
            icon: <ShieldIcon size={16} />,
            title: "Admin",
            href: "/admin/requests",
          },
        ]
      : []),
  ];

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className="ml-auto flex items-center gap-3">
          {session.user.isAdmin && <AdminModePill />}
          <ModeToggle />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>{children}</Main>
    </>
  );
}
