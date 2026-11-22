import Link from "next/link";

const links = [
  { href: "/admin", label: "Обзор" },
  { href: "/admin/settings", label: "Настройки" },
] as const;

export function AdminNav() {
  return (
    <aside className="flex w-full flex-col gap-6 border-b border-border bg-muted/30 px-6 py-6 md:w-56 md:shrink-0 md:border-b-0 md:border-r md:py-10">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin"
          className="text-sm font-medium tracking-tight transition-colors hover:text-foreground"
        >
          Админ
        </Link>
        <p className="text-xs text-muted-foreground">Консоль WorkBot</p>
      </div>
      <nav aria-label="Админ-навигация" className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <Link
        href="/"
        className="mt-auto text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← На сайт
      </Link>
    </aside>
  );
}
