import type { Metadata } from "next";

import { AdminNav } from "@/components/admin-nav";

export const metadata: Metadata = {
  title: {
    default: "Админ",
    template: "%s · Админ · WorkBot",
  },
  description: "Админ-консоль WorkBot.",
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <AdminNav />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
