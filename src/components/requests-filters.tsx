import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "cn";

import {
  buildRequestsHref,
  statusLabels,
  statuses,
  teamLabels,
  teams,
  type RequestFilters,
} from "@/lib/request-model";

type RequestsFiltersProps = {
  filters: RequestFilters;
};

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-2.5 py-1 text-sm transition-colors",
        active
          ? "bg-secondary text-secondary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

export function RequestsFilters({ filters }: RequestsFiltersProps) {
  return (
    <div className="flex flex-col gap-3" aria-label="Фильтры заявок">
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">Команда</p>
        <div className="flex flex-wrap gap-1" role="list">
          <FilterLink
            href={buildRequestsHref({ status: filters.status })}
            active={!filters.team}
          >
            Все
          </FilterLink>
          {teams.map((team) => (
            <FilterLink
              key={team}
              href={buildRequestsHref({ team, status: filters.status })}
              active={filters.team === team}
            >
              {teamLabels[team]}
            </FilterLink>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">Статус</p>
        <div className="flex flex-wrap gap-1" role="list">
          <FilterLink
            href={buildRequestsHref({ team: filters.team })}
            active={!filters.status}
          >
            Все
          </FilterLink>
          {statuses.map((status) => (
            <FilterLink
              key={status}
              href={buildRequestsHref({ team: filters.team, status })}
              active={filters.status === status}
            >
              {statusLabels[status]}
            </FilterLink>
          ))}
        </div>
      </div>
    </div>
  );
}
