"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        Что-то сломалось
      </h1>
      <p className="text-muted-foreground">
        Произошла ошибка при обработке запроса. Можно попробовать ещё раз.
      </p>
      <div>
        <Button type="button" onClick={() => reset()}>
          Повторить
        </Button>
      </div>
    </main>
  );
}
