import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Для Вики",
  description: "Страница, полная любви и сердечек — для Вики.",
};

const floatingHearts = [
  { left: "4%", top: "8%", size: "text-2xl", delay: "0ms" },
  { left: "18%", top: "18%", size: "text-4xl", delay: "120ms" },
  { left: "78%", top: "10%", size: "text-3xl", delay: "80ms" },
  { left: "88%", top: "28%", size: "text-5xl", delay: "200ms" },
  { left: "8%", top: "42%", size: "text-xl", delay: "160ms" },
  { left: "92%", top: "48%", size: "text-2xl", delay: "40ms" },
  { left: "12%", top: "68%", size: "text-4xl", delay: "240ms" },
  { left: "72%", top: "62%", size: "text-3xl", delay: "100ms" },
  { left: "48%", top: "6%", size: "text-xl", delay: "180ms" },
  { left: "58%", top: "78%", size: "text-5xl", delay: "60ms" },
  { left: "28%", top: "86%", size: "text-2xl", delay: "220ms" },
  { left: "82%", top: "84%", size: "text-xl", delay: "140ms" },
] as const;

const heartRain = Array.from({ length: 48 }, () => "♥");

export default function VikaPage() {
  return (
    <main className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-gradient-to-b from-rose-50 via-pink-50 to-rose-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {floatingHearts.map((heart) => (
          <span
            key={`${heart.left}-${heart.top}`}
            className={`absolute text-rose-300/70 animate-in fade-in zoom-in-50 duration-700 fill-mode-both ${heart.size}`}
            style={{
              left: heart.left,
              top: heart.top,
              animationDelay: heart.delay,
            }}
          >
            ♥
          </span>
        ))}
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-6 py-20 text-center">
        <p
          aria-hidden
          className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-2xl leading-none text-rose-400 sm:text-3xl animate-in fade-in duration-700"
        >
          {heartRain.map((heart, index) => (
            <span
              key={index}
              className={
                index % 5 === 0
                  ? "text-rose-500"
                  : index % 3 === 0
                    ? "text-pink-400"
                    : "text-rose-300"
              }
            >
              {heart}
            </span>
          ))}
        </p>

        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150 fill-mode-both">
          <p className="text-sm font-medium tracking-[0.2em] text-rose-500 uppercase">
            только для тебя
          </p>
          <h1 className="font-heading text-5xl font-semibold tracking-tight text-rose-950 sm:text-6xl">
            Вика ♥
          </h1>
          <p className="mx-auto max-w-md text-lg leading-relaxed text-rose-900/80">
            Я тебя люблю. Здесь много сердечек — почти столько же, сколько
            тёплых мыслей о тебе каждый день. Спасибо, что ты есть.
          </p>
          <p className="text-base text-rose-700/90">
            ♥ ♥ ♥ Ты — моё самое романтичное «да» ♥ ♥ ♥
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 animate-in fade-in duration-700 delay-300 fill-mode-both">
          <Button
            className="bg-rose-600 text-white hover:bg-rose-700"
            render={<Link href="/" />}
          >
            На главную
          </Button>
          <p aria-hidden className="w-full text-3xl text-rose-400 sm:w-auto">
            ♥♥♥♥♥♥♥♥♥♥
          </p>
        </div>
      </div>
    </main>
  );
}
