import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import {
  getPolicy,
  listPolicyStaticParams,
  policySlugSchema,
} from "@/lib/policies";

type PolicyPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return listPolicyStaticParams();
}

export async function generateMetadata({
  params,
}: PolicyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const policy = await getPolicy(slug);

  if (!policy) {
    return { title: "Политика не найдена" };
  }

  return {
    title: policy.title,
    description: policy.summary,
  };
}

export default async function PolicyPage({ params }: PolicyPageProps) {
  const { slug } = await params;

  if (!policySlugSchema.safeParse(slug).success) {
    notFound();
  }

  const policy = await getPolicy(slug);
  if (!policy) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <Link href="/policies" className="hover:text-foreground">
            ← Все политики
          </Link>
        </p>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Команда: {policy.team}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {policy.title}
        </h1>
        <p className="text-muted-foreground">{policy.summary}</p>
      </div>
      <article className="prose max-w-none">
        <ReactMarkdown>{policy.body}</ReactMarkdown>
      </article>
    </main>
  );
}
