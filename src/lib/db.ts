import { neon } from "@neondatabase/serverless";
import type { PlannerState } from "@/types/schedule";

const DEFAULT_WORKSPACE_ID = "default";

function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Thiếu biến môi trường DATABASE_URL cho Neon PostgreSQL.");
  }
  return neon(databaseUrl);
}

let schemaInitialized = false;

export async function ensurePlannerTable(): Promise<void> {
  if (schemaInitialized) return;
  const sql = getSqlClient();
  await sql`
    CREATE TABLE IF NOT EXISTS planner_workspaces (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  schemaInitialized = true;
}

export async function getWorkspaceFromDb(
  workspaceId: string = DEFAULT_WORKSPACE_ID
): Promise<{ exists: boolean; data: unknown; updatedAt: string | null }> {
  await ensurePlannerTable();
  const sql = getSqlClient();
  const rows = await sql`
    SELECT data, updated_at
    FROM planner_workspaces
    WHERE id = ${workspaceId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return { exists: false, data: null, updatedAt: null };
  }

  const row = rows[0] as { data: unknown; updated_at: string | Date };
  return {
    exists: true,
    data: row.data,
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
  };
}

export async function saveWorkspaceToDb(
  state: PlannerState,
  workspaceId: string = DEFAULT_WORKSPACE_ID
): Promise<{ updatedAt: string }> {
  await ensurePlannerTable();
  const sql = getSqlClient();
  const jsonPayload = JSON.stringify(state);

  const rows = await sql`
    INSERT INTO planner_workspaces (id, data, updated_at)
    VALUES (${workspaceId}, ${jsonPayload}::jsonb, NOW())
    ON CONFLICT (id)
    DO UPDATE SET
      data = EXCLUDED.data,
      updated_at = NOW()
    RETURNING updated_at
  `;

  const row = rows[0] as { updated_at: string | Date } | undefined;
  return {
    updatedAt:
      row?.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row?.updated_at ?? new Date().toISOString()),
  };
}

