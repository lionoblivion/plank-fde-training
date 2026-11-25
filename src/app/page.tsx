import Link from "next/link";

import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

/** Разделы приложения + health — все доступные с главной. */
const homeLinks = [
  { href: "/chat", label: "Чат", variant: "default" as const },
  { href: "/requests", label: "Заявки", variant: "outline" as const },
  { href: "/policies", label: "Политики", variant: "outline" as const },
  { href: "/admin", label: "Админ", variant: "outline" as const },
  {
    href: "/admin/settings",
    label: "Настройки",
    variant: "outline" as const,
  },
  { href: "/api/health", label: "Состояние", variant: "outline" as const },
];

export default function Home() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-16">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-semibold tracking-tight">
            <Link href="/" className="hover:underline">
              WorkBot
            </Link>
          </h1>
          <p className="text-lg text-muted-foreground">
            Корпоративная платформа рабочих процессов: помогает командам
            операций, финансов и поддержки вести работу в уже используемых
            системах.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {homeLinks.map((link) => (
            <Button
              key={link.href}
              variant={link.variant}
              nativeButton={false}
              render={<Link href={link.href} />}
            >
              {link.label}
            </Button>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
