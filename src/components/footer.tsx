import Link from "next/link";

const links = [
  { href: "/", label: "Главная" },
  { href: "/settings", label: "Настройки" },
  { href: "/api/health", label: "Состояние" },
  { href: "/vika", label: "Для Вики ♥" },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium tracking-tight">WorkBot</p>
          <p className="text-sm text-muted-foreground">
            © 2026 WorkBot. Все права защищены.
          </p>
        </div>
        <nav
          aria-label="Подвал"
          className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
