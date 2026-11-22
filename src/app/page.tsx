import Link from "next/link";

import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-16">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-semibold tracking-tight">
            <Link href="/settings" className="hover:underline">
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
          <Button render={<Link href="/settings" />}>Настройки</Button>
          <Button variant="outline" render={<Link href="/api/health" />}>
            Состояние
          </Button>
          <Button
            className="bg-rose-600 text-white hover:bg-rose-700"
            render={<Link href="/vika" />}
          >
            Для Вики ♥
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
