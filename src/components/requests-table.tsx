import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export function RequestsTable({ requests }: { requests: WorkRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-border px-6 py-10">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Заявок пока нет</p>
          <p className="text-sm text-muted-foreground">
            Создайте первую заявку — она появится в этом списке.
          </p>
        </div>
        <Button render={<Link href="/requests/new" />}>Новая заявка</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button render={<Link href="/requests/new" />}>Новая заявка</Button>
      </div>
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
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium whitespace-normal">
                <Link
                  href={`/requests/${request.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {request.title}
                </Link>
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
    </div>
  );
}
