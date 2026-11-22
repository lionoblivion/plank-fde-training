import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listPolicies } from "@/lib/policies";

export const metadata: Metadata = {
  title: "Политики",
  description: "Корпоративные политики WorkBot.",
};

export default async function PoliciesPage() {
  const policies = await listPolicies();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Политики компании</CardTitle>
          <CardDescription>
            Документы из Markdown: каждая политика принадлежит
            команде-владельцу.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {policies.map((policy) => (
              <li key={policy.slug} className="py-4 first:pt-0 last:pb-0">
                <Link
                  href={`/policies/${policy.slug}`}
                  className="text-base font-medium transition-colors hover:text-foreground"
                >
                  {policy.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {policy.summary}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                  Команда: {policy.team}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
