const capabilities = [
  {
    title: "Приём заявок и смена статусов",
    body: "Команды создают заявки с заголовком, описанием, командой и приоритетом, открывают карточку и переводят статус: открыта, в работе, выполнена.",
  },
  {
    title: "Фильтры и админ-обзор",
    body: "Список заявок фильтруется по команде и статусу через адрес страницы; на админ-панели видны счётчики по статусам и последние заявки.",
  },
  {
    title: "Политики компании из Markdown",
    body: "Политики хранятся как Markdown с front matter, собираются в общий каталог и открываются на отдельных страницах.",
  },
] as const;

/** Статичный макет списка заявок — визуальный якорь продукта без API. */
function ProductPreview() {
  const rows = [
    {
      title: "Замена ноутбука",
      team: "Операции",
      status: "В работе",
      priority: "Высокий",
    },
    {
      title: "Проверка счёта поставщика",
      team: "Финансы",
      status: "Открыта",
      priority: "Средний",
    },
    {
      title: "Доступ для нового сотрудника",
      team: "Поддержка",
      status: "Выполнена",
      priority: "Низкий",
    },
  ] as const;

  return (
    <div
      id="preview"
      aria-hidden="true"
      className="animate-rise-in relative w-full border-y border-line bg-surface"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5 sm:py-6">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-accent/80" />
          <span className="text-sm font-medium text-foreground">Заявки</span>
        </div>
        <div className="hidden gap-2 text-xs text-muted sm:flex">
          <span className="bg-accent-soft px-2 py-1 text-accent">Команда</span>
          <span className="border border-line px-2 py-1">Статус</span>
        </div>
      </div>
      <div className="divide-y divide-line border-t border-line">
        {rows.map((row) => (
          <div
            key={row.title}
            className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto] gap-3 px-6 py-4 sm:grid-cols-[1.4fr_0.5fr_0.6fr_0.5fr]"
          >
            <p className="text-sm font-medium text-foreground">{row.title}</p>
            <p className="hidden text-sm text-muted sm:block">{row.team}</p>
            <p className="hidden text-sm text-muted sm:block">{row.status}</p>
            <p className="justify-self-end text-sm text-muted">
              {row.priority}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <p className="font-display text-lg tracking-tight text-foreground">
            WorkBot
          </p>
          <a
            href="#capabilities"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Возможности
          </a>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="relative overflow-hidden pt-24 sm:pt-28">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--hero-glow)_0%,_transparent_55%),linear-gradient(180deg,_#eef6f2_0%,_var(--background)_72%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-24 h-64 bg-[linear-gradient(90deg,transparent_0%,rgba(15,118,110,0.06)_50%,transparent_100%)]"
          />

          <div className="relative mx-auto flex w-full max-w-6xl flex-col px-6 pb-12 sm:pb-16">
            <div className="mx-auto max-w-3xl text-center">
              <p className="animate-fade-up font-display text-5xl tracking-tight text-foreground sm:text-6xl md:text-7xl">
                WorkBot
              </p>
              <h1 className="animate-fade-up-delay mt-5 text-balance text-xl font-medium leading-snug text-foreground sm:text-2xl">
                WorkBot помогает командам операций, финансов и поддержки
                создавать, отслеживать и закрывать внутренние заявки в одном
                месте.
              </h1>
              <p className="animate-fade-up-delay mt-4 text-base text-muted sm:text-lg">
                Один процесс для приёма заявок, смены статусов, фильтров и
                политик компании — без передачи через таблицы.
              </p>
              <div className="animate-fade-up-delay mt-8 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="#capabilities"
                  className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
                >
                  Смотреть возможности
                </a>
                <a
                  href="#preview"
                  className="inline-flex items-center justify-center rounded-lg border border-line bg-surface/80 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent-soft/70"
                >
                  Превью продукта
                </a>
              </div>
            </div>
          </div>

          <ProductPreview />
        </section>

        <section id="capabilities" className="bg-background py-16 sm:py-20">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
                Три возможности, которые уже есть в продукте
              </h2>
              <p className="mt-3 text-base text-muted sm:text-lg">
                Публичный сайт описывает то, что WorkBot умеет сегодня, а не
                будущий roadmap.
              </p>
            </div>

            <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
              {capabilities.map((item, index) => (
                <li key={item.title} className="flex flex-col gap-3">
                  <span className="text-sm font-medium text-accent">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted sm:text-base">
                    {item.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-sm text-foreground">WorkBot</p>
          <p className="text-sm text-muted">
            Публичный маркетинговый сайт. Здесь нет аккаунтов, API и секретов.
          </p>
        </div>
      </footer>
    </>
  );
}
