import { NextResponse } from "next/server";
import {
  logWebhookRequest,
  saveWebhookPayload,
  testDbConnection,
} from "@/lib/db";

function isMondayChallenge(
  payload: unknown
): payload is { challenge: string } {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const keys = Object.keys(payload);

  return (
    keys.length === 1 &&
    keys[0] === "challenge" &&
    typeof payload.challenge === "string"
  );
}

export async function GET() {
  try {
    const status = await testDbConnection();

    return NextResponse.json(status);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao conectar no banco";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userAgent = request.headers.get("user-agent");

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    await logWebhookRequest("invalid_json", null, userAgent).catch(() => {});

    return NextResponse.json(
      { success: false, error: "JSON inválido" },
      { status: 400 }
    );
  }

  const kind = isMondayChallenge(payload) ? "challenge" : "event";

  await logWebhookRequest(kind, payload, userAgent).catch(() => {});

  try {
    const id = await saveWebhookPayload(payload);

    if (isMondayChallenge(payload)) {
      return NextResponse.json({ challenge: payload.challenge }, { status: 200 });
    }

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao salvar webhook";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
