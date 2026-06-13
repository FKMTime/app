import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ModeToggle } from "@/components/mode-toggle";
import { Header } from "@/components/protected/header";
import { Main } from "@/components/protected/main";
import { ProfileDropdown } from "@/components/protected/profile-dropdown";

export default async function PanelOuterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/");

  return (
    <>
      <Header>
        <div className="text-sm font-medium">FKMTime · Panel</div>
        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>{children}</Main>
    </>
  );
}
