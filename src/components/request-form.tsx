"use client";

import { useActionState } from "react";

import {
  createRequestAction,
  type CreateRequestState,
} from "@/app/requests/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { priorities, priorityLabels, teamLabels, teams } from "@/lib/requests";

const initialState: CreateRequestState = {};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) {
    return null;
  }

  return (
    <p className="text-sm text-destructive" role="alert">
      {messages[0]}
    </p>
  );
}

export function RequestForm() {
  const [state, action, pending] = useActionState(
    createRequestAction,
    initialState,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Заголовок</Label>
        <Input
          id="title"
          name="title"
          required
          aria-invalid={Boolean(state.errors?.title)}
          placeholder="Кратко о сути заявки"
        />
        <FieldError messages={state.errors?.title} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="details">Описание</Label>
        <Textarea
          id="details"
          name="details"
          aria-invalid={Boolean(state.errors?.details)}
          placeholder="Подробности, контекст, ожидаемый результат"
        />
        <FieldError messages={state.errors?.details} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="team">Команда</Label>
        <NativeSelect
          id="team"
          name="team"
          required
          className="w-full"
          aria-invalid={Boolean(state.errors?.team)}
          defaultValue=""
        >
          <NativeSelectOption value="" disabled>
            Выберите команду
          </NativeSelectOption>
          {teams.map((team) => (
            <NativeSelectOption key={team} value={team}>
              {teamLabels[team]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldError messages={state.errors?.team} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="priority">Приоритет</Label>
        <NativeSelect
          id="priority"
          name="priority"
          className="w-full"
          aria-invalid={Boolean(state.errors?.priority)}
          defaultValue="medium"
        >
          {priorities.map((priority) => (
            <NativeSelectOption key={priority} value={priority}>
              {priorityLabels[priority]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldError messages={state.errors?.priority} />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Отправка…" : "Создать заявку"}
      </Button>
    </form>
  );
}
