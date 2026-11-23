import { config } from "@/lib/config";
import { query } from "@/lib/db";

export async function GET() {
  try {
    await query("select 1 as ok");
    return Response.json({
      status: "ok",
      commit: config.commit,
      database: "ok",
    });
  } catch {
    return Response.json(
      {
        status: "error",
        commit: config.commit,
        database: "unreachable",
      },
      { status: 503 },
    );
  }
}
