import { NextResponse } from "next/server";
import { getWorkspaceFromDb, saveWorkspaceToDb } from "@/lib/db";
import { validateAndParseState } from "@/lib/storage";

export const dynamic = "force-dynamic";

function sanitizeWorkspaceId(raw: string | null): string {
  if (!raw) return "default";
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_-]/g, "");
  return cleaned.slice(0, 48) || "default";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = sanitizeWorkspaceId(searchParams.get("workspaceId"));

    const result = await getWorkspaceFromDb(workspaceId);
    if (!result.exists || !result.data) {
      return NextResponse.json({
        exists: false,
        state: null,
        updatedAt: null,
      });
    }

    const parsed = validateAndParseState(JSON.stringify(result.data));
    if (!parsed.ok) {
      return NextResponse.json(
        { error: "Dữ liệu trên database không hợp lệ." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exists: true,
      state: parsed.state,
      updatedAt: result.updatedAt,
    });
  } catch (error) {
    console.error("GET /api/planner error:", error);
    return NextResponse.json(
      { error: "Không thể kết nối Neon PostgreSQL." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      workspaceId?: string;
      state?: unknown;
    };

    const workspaceId = sanitizeWorkspaceId(body.workspaceId ?? null);
    const rawState = body.state ?? body;
    const parsed = validateAndParseState(JSON.stringify(rawState));

    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const saved = await saveWorkspaceToDb(parsed.state, workspaceId);
    return NextResponse.json({
      ok: true,
      updatedAt: saved.updatedAt,
    });
  } catch (error) {
    console.error("PUT /api/planner error:", error);
    return NextResponse.json(
      { error: "Không thể lưu dữ liệu lên Neon PostgreSQL." },
      { status: 500 }
    );
  }
}

