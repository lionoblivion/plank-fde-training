/** Команды из брифа курса Plank Day 3. */
export const teams = ["operations", "finance", "support"] as const;

/** Уровни приоритета для badges и фильтров списка. */
export const priorities = ["low", "medium", "high"] as const;

/** Статусы заявки для списка и смены статуса. */
export const statuses = ["open", "in_progress", "done"] as const;

/** Подписи команд для UI. */
export const teamLabels: Record<(typeof teams)[number], string> = {
  operations: "Операции",
  finance: "Финансы",
  support: "Поддержка",
};

/** Подписи приоритетов для UI. */
export const priorityLabels: Record<(typeof priorities)[number], string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

/** Подписи статусов для UI. */
export const statusLabels: Record<(typeof statuses)[number], string> = {
  open: "Открыта",
  in_progress: "В работе",
  done: "Готово",
};
