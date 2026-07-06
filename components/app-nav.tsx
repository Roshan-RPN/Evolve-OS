import Link from "next/link";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/morning", label: "Morning" },
  { href: "/afternoon", label: "Afternoon" },
  { href: "/evening", label: "Evening" },
  { href: "/habits", label: "Habits" },
];

export function AppNav() {
  return (
    <nav className="mx-auto flex w-full max-w-2xl items-center justify-center gap-1 p-4">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
