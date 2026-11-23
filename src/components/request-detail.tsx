import Link from "next/link";

import { RequestStatusActions } from "@/components/request-status-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  priorityLabels,
  statusLabels,
  teamLabels,
  type WorkRequest,
} from "@/lib/request-model";

function priorityVariant(
  priority: WorkRequest["priority"],
): "outline" | "secondary" | "destructive" {
  if (priority === "high") {
    return "destructive";
  }
  if (priority === "low") {
    return "outline";
  }
  return "secondary";
}

function statusVariant(
  status: WorkRequest["status"],
): "outline" | "secondary" | "default" {
  if (status === "done") {
    return "outline";
  }
  if (status === "in_progress") {
    return "secondary";
  }
  return "default";
}

function formatCreatedAt(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export function RequestDetail({ request }: { request: WorkRequest }) {
  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {request.title}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{teamLabels[request.team]}</Badge>
          <Badge variant={priorityVariant(request.priority)}>
            {priorityLabels[request.priority]}
          </Badge>
          <Badge variant={statusVariant(request.status)}>
            {statusLabels[request.status]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Создана: {formatCreatedAt(request.createdAt)}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Описание</h2>
        {request.details ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {request.details}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Описание не указано.</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Сменить статус</h2>
        <RequestStatusActions request={request} />
      </div>
      <div>
        <Button variant="outline" render={<Link href="/requests" />}>
          К списку заявок
        </Button>
      </div>
    </article>
  );
}
