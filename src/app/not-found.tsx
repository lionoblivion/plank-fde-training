import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 overflow-hidden px-6 py-16">
      <p
        aria-hidden
        className="pointer-events-none select-none font-heading text-[clamp(7rem,28vw,14rem)] leading-none font-semibold tracking-tighter text-foreground/8 animate-in fade-in zoom-in-95 duration-700"
      >
        404
      </p>
      <div className="-mt-[min(28vw,9rem)] flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-150 fill-mode-both">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Страница не найдена
        </h1>
        <p className="max-w-md text-muted-foreground">
          Такой страницы нет или она была перемещена. Вернитесь на главную,
          чтобы продолжить работу с WorkBot.
        </p>
        <div>
          <Button render={<Link href="/" />}>На главную</Button>
        </div>
      </div>
    </main>
  );
}
