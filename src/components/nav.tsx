"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, TargetIcon, UsersIcon } from "./icons";

const LINKS = [
  { href: "/", label: "Inicio", icon: HomeIcon },
  { href: "/leads", label: "Leads", icon: UsersIcon },
  { href: "/objetivos", label: "Objetivos", icon: TargetIcon },
] as const;

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

export function SideNav() {
  const isActive = useIsActive();
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-6 md:flex">
      <Link href="/" className="mb-8 px-3 text-lg font-semibold tracking-tight">
        CRM <span className="text-emerald-600">Ventas</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 aria-[current=page]:bg-slate-900 aria-[current=page]:text-white"
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const isActive = useIsActive();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className="flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium text-slate-500 aria-[current=page]:text-emerald-600"
        >
          <Icon className="size-6" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
