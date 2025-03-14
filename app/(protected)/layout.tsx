import { auth } from "@/auth";
import { ModeToggle } from "@/components/mode-toggle";
import { Header } from "@/components/protected/header";
import { Main } from "@/components/protected/main";
import { ProfileDropdown } from "@/components/protected/profile-dropdown";
import { TopNav } from "@/components/protected/top-nav";
import { CommandIcon, HomeIcon, KeyIcon } from "lucide-react";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session) {
    redirect('/');
  }

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className='ml-auto flex items-center space-x-4'>
          <ModeToggle />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>
        {children}
      </Main>
    </>
  );
}

const topNav = [
  {
    icon: <HomeIcon size={16} />,
    title: 'Home',
    href: 'dashboard',
    isActive: true,
  },
  {
    icon: <CommandIcon size={16} />,
    title: 'Managable competitions',
    href: 'dashboard/competitions',
    isActive: false,
  },
]
