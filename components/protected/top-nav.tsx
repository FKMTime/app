"use client";

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MenuIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface TopNavProps extends React.HTMLAttributes<HTMLElement> {
  links: {
    title: string;
    href: string;
    disabled?: boolean;
    icon?: React.ReactNode;
  }[];
}

export function TopNav({ className, links, ...props }: TopNavProps) {
  const path = usePathname();
  const router = useRouter();
  const isActive = (href: string) => path === href || path.startsWith(`${href}/`);

  const handleNavigation = (href: string) => {
    if (path !== href) {
      router.push(href);
    }
  };

  return (
    <>
      <div className='md:hidden'>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button size='icon' variant='outline'>
              <MenuIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side='bottom' align='start'>
            {links.map(({ title, href }) => (
              <DropdownMenuItem key={href} asChild>
                <Link
                  href={href}
                  className={isActive(href) ? 'text-primary' : 'text-muted-foreground'}
                >
                  {title}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className={cn('hidden items-center space-x-4 md:flex lg:space-x-6', className)} {...props}>
        {links.map(({ title, href, icon }) => (
          <button
            key={href}
            onClick={() => handleNavigation(href)}
            className={`text-sm font-medium transition-colors hover:text-primary flex gap-2 items-center ${isActive(href) ? 'text-primary' : 'text-muted-foreground'}`}
          >
            {icon}
            {title}
          </button>
        ))}
      </nav>
    </>
  );
}