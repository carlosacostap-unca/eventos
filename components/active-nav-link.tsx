"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ActiveNavLink({ href, children, exact = false }: {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || (!exact && pathname.startsWith(href + "/"));
  return <Link href={href} aria-current={active ? "page" : undefined}>{children}</Link>;
}
