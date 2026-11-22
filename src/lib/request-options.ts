/** Команды из брифа курса Plank Day 3. */
export const teams = ["operations", "finance", "support"] as const;

/** Уровни приоритета для badges и фильтров списка. */
export const priorities = ["low", "medium", "high"] as const;

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
