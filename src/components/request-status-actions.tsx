import { setStatus } from "@/app/requests/actions";
import { Button } from "@/components/ui/button";
import { statusLabels, statuses, type WorkRequest } from "@/lib/requests";

type RequestStatusActionsProps = {
  request: WorkRequest;
};

/** Кнопки перехода на каждый другой статус заявки (одна форма, разные formAction). */
export function RequestStatusActions({ request }: RequestStatusActionsProps) {
  const otherStatuses = statuses.filter((status) => status !== request.status);

  if (otherStatuses.length === 0) {
    return null;
  }

  return (
    <form className="flex flex-wrap gap-2">
      {otherStatuses.map((status) => (
        <Button
          key={status}
          type="submit"
          variant="outline"
          formAction={setStatus.bind(null, request.id, status)}
        >
          {statusLabels[status]}
        </Button>
      ))}
    </form>
  );
}
