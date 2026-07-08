"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  CalendarClock,
  Flame,
  BarChart3,
  Sunrise,
  Sun,
  MoonStar,
  Sparkles,
  Target,
  Gem,
  UserRound,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { APP_NAME, APP_MARK } from "@/lib/brand";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  grad: string;
};

const PRIMARY: NavItem[] = [
  { href: "/", label: "Today", icon: LayoutDashboard, grad: "grad-blue" },
  { href: "/goals", label: "Goals", icon: Target, grad: "grad-violet" },
  { href: "/schedule", label: "Schedule", icon: CalendarClock, grad: "grad-indigo" },
  { href: "/habits", label: "Habits", icon: Flame, grad: "grad-coral" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, grad: "grad-emerald" },
];

const DESK_EXTRA: NavItem[] = [
  { href: "/manifestation", label: "Manifest", icon: Gem, grad: "grad-violet" },
  { href: "/untangle", label: "Untangle", icon: Sparkles, grad: "grad-teal" },
];

const JOURNAL: NavItem[] = [
  { href: "/morning", label: "Morning", icon: Sunrise, grad: "grad-coral" },
  { href: "/afternoon", label: "Afternoon", icon: Sun, grad: "grad-amber" },
  { href: "/evening", label: "Evening", icon: MoonStar, grad: "grad-dusk" },
  { href: "/journal", label: "History", icon: BookOpen, grad: "grad-violet" },
];

// Account lives at the bottom of the sidebar, after the journal section.
const ACCOUNT: NavItem[] = [
  { href: "/profile", label: "Profile", icon: UserRound, grad: "grad-slate" },
];

// Every page rides the scrollable bottom bar — swipe sideways past Analytics for the rest.
const MOBILE_ALL: NavItem[] = [...PRIMARY, ...JOURNAL, ...DESK_EXTRA, ...ACCOUNT];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

const STORAGE_KEY = "kairos.sidebar.collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [{ collapsed, ready }, setState] = useState({ collapsed: false, ready: false });

  // restore collapse preference once on mount (avoid layout flash before we know it)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration of a persisted UI pref
    setState({ collapsed: localStorage.getItem(STORAGE_KEY) === "1", ready: true });
  }, []);

  function toggle() {
    setState((s) => {
      const next = !s.collapsed;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return { collapsed: next, ready: true };
    });
  }

  return (
    <div className="bg-app min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col gap-2 border-r border-border/60 bg-sidebar p-3 transition-[width] duration-300 lg:flex ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className={`mb-3 flex items-center ${collapsed ? "justify-center" : "justify-between"} px-1`}>
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl grad-blue text-lg font-bold text-white shadow-lg">
              {APP_MARK}
            </span>
            {!collapsed && (
              <span className="wordmark text-xl">{APP_NAME}</span>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={toggle}
              aria-label="Collapse sidebar"
              className="grid size-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <PanelLeftClose className="size-[18px]" />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={toggle}
            aria-label="Expand sidebar"
            className="mb-1 grid size-10 place-items-center self-center rounded-xl text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            <PanelLeftOpen className="size-[18px]" />
          </button>
        )}

        {/* Nav scrolls on short screens; Account + CTA stay pinned below so Profile is always reachable */}
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
          <NavGroup items={[...PRIMARY, ...DESK_EXTRA]} pathname={pathname} collapsed={collapsed} />

          {!collapsed && (
            <p className="mb-1 mt-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Journal
            </p>
          )}
          <NavGroup items={JOURNAL} pathname={pathname} collapsed={collapsed} />
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border/50 pt-2">
          <NavGroup items={ACCOUNT} pathname={pathname} collapsed={collapsed} />
        </div>
      </aside>

      {/* Mobile top bar — slim, safe-area aware */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
        <div className="flex h-12 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg grad-blue text-[13px] font-bold text-white shadow-sm">
              {APP_MARK}
            </span>
            <span className="wordmark text-[17px]">{APP_NAME}</span>
          </Link>
          <Link
            href="/profile"
            aria-label="Profile"
            className="grid size-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            <UserRound className="size-[18px]" />
          </Link>
        </div>
      </header>

      {/* Main — wider content, offset by current sidebar width.
          No hardcoded lg:pl here — the conditional owns it, else pl-72 + pl-28 collide. */}
      <main
        className={`w-full max-w-[1560px] px-3.5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3.5 transition-[padding] duration-300 lg:px-4 lg:pb-6 lg:pt-4 lg:pr-10 ${
          ready && collapsed ? "lg:pl-28" : "lg:pl-72"
        }`}
      >
        {children}
      </main>

      {/* Mobile bottom nav — frosted tab bar, scrolls sideways so every page fits, safe-area aware */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/40 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl lg:hidden">
        {/* right-edge fade hints there's more to swipe */}
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background/90 to-transparent" />
        <div className="no-scrollbar flex h-[60px] items-stretch overflow-x-auto px-1">
          {MOBILE_ALL.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="relative flex w-[72px] shrink-0 flex-col items-center justify-center gap-0.5"
              >
                {active && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute top-1.5 h-[30px] w-12 overflow-hidden rounded-full"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  >
                    {/* nested so motion's crossfade doesn't clobber the tint opacity */}
                    <span className={`absolute inset-0 ${item.grad} opacity-15`} />
                  </motion.span>
                )}
                <Icon
                  className={`relative size-[21px] transition-colors ${
                    active ? "text-primary" : "text-muted-foreground/80"
                  }`}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span
                  className={`relative text-[10px] leading-none ${
                    active ? "font-semibold text-primary" : "font-medium text-muted-foreground/80"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function NavGroup({
  items,
  pathname,
  collapsed,
}: {
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-colors ${
              collapsed ? "justify-center" : ""
            } ${
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
            }`}
          >
            {active && !collapsed && (
              <motion.span
                layoutId="nav-active"
                className="absolute left-0 h-6 w-1 rounded-full grad-blue"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-xl transition-all ${
                active ? `${item.grad} text-white shadow-md` : "bg-muted text-muted-foreground group-hover:text-foreground"
              }`}
            >
              <Icon className="size-[18px]" />
            </span>
            {!collapsed && item.label}
          </Link>
        );
      })}
    </div>
  );
}
