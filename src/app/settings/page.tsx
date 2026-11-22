import { redirect } from "next/navigation";

/** Старый путь: настройки переехали в /admin/settings. */
export default function SettingsRedirectPage() {
  redirect("/admin/settings");
}
