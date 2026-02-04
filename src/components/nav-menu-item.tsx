
'use client';

import { useSidebar, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { SheetClose } from '@/components/ui/sheet';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

type NavMenuItemProps = {
  href: string;
  tooltip: string;
  icon: LucideIcon;
  children: React.ReactNode;
};

export function NavMenuItem({ href, tooltip, icon: Icon, children }: NavMenuItemProps) {
  const { isMobile } = useSidebar();

  const button = (
    <SidebarMenuButton asChild tooltip={tooltip}>
      <Link href={href}>
        <Icon />
        <span>{children}</span>
      </Link>
    </SidebarMenuButton>
  );

  return (
    <SidebarMenuItem>
      {isMobile ? <SheetClose asChild>{button}</SheetClose> : button}
    </SidebarMenuItem>
  );
}