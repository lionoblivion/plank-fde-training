import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-6 py-4">
        <Link
          href="/"
          className="text-sm font-medium tracking-tight transition-colors hover:text-foreground"
        >
          WorkBot
        </Link>
        <nav
          aria-label="Основная навигация"
          className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"
        >
          <Link href="/" className="transition-colors hover:text-foreground">
            Главная
          </Link>
          <Link
            href="/chat"
            className="transition-colors hover:text-foreground"
          >
            Чат
          </Link>
          <Link
            href="/requests"
            className="transition-colors hover:text-foreground"
          >
            Заявки
          </Link>
          <Link
            href="/policies"
            className="transition-colors hover:text-foreground"
          >
            Политики
          </Link>
          <Link
            href="/admin"
            className="transition-colors hover:text-foreground"
          >
            Админ
          </Link>
          <Link
            href="/admin/settings"
            className="transition-colors hover:text-foreground"
          >
            Настройки
          </Link>
        </nav>
      </div>
    </header>
  );
}
