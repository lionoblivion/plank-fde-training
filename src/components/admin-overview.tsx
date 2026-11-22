import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  countRequestsByStatus,
  priorityLabels,
  statusLabels,
  statuses,
  teamLabels,
  type WorkRequest,
} from "@/lib/requests";

const LATEST_LIMIT = 5;

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

export function AdminOverview({ requests }: { requests: WorkRequest[] }) {
  const counts = countRequestsByStatus(requests);
  const latest = requests.slice(0, LATEST_LIMIT);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Обзор</h1>
        <p className="text-sm text-muted-foreground">
          Сводка по заявкам: счётчики по статусам и последние поступления.
        </p>
      </div>

      <section aria-label="Счётчики по статусам">
        <div className="grid gap-4 sm:grid-cols-3">
          {statuses.map((status) => (
            <Card key={status} size="sm">
              <CardHeader>
                <CardDescription>{statusLabels[status]}</CardDescription>
                <CardTitle className="text-3xl font-semibold tracking-tight">
                  {counts[status]}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section aria-label="Последние заявки">
        <Card>
          <CardHeader>
            <CardTitle>Последние заявки</CardTitle>
            <CardDescription>
              До пяти самых новых из общего списка.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {latest.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-6 py-10">
                <p className="text-sm font-medium">Заявок пока нет</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Создайте заявку — она появится в обзоре и в{" "}
                  <Link
                    href="/requests"
                    className="underline underline-offset-4"
                  >
                    списке
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Заголовок</TableHead>
                    <TableHead>Команда</TableHead>
                    <TableHead>Приоритет</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latest.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium whitespace-normal">
                        {request.title}
                      </TableCell>
                      <TableCell>{teamLabels[request.team]}</TableCell>
                      <TableCell>
                        <Badge variant={priorityVariant(request.priority)}>
                          {priorityLabels[request.priority]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(request.status)}>
                          {statusLabels[request.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
