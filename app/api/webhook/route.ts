import { NextResponse } from "next/server";
import { saveWebhookPayload } from "@/lib/db";

function isMondayChallenge(
  payload: unknown
): payload is { challenge: string } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "challenge" in payload &&
    typeof payload.challenge === "string"
  );
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "JSON inválido" },
      { status: 400 }
    );
  }

  // monday.com envia um challenge na validação da URL do webhook
  // https://developer.monday.com/api-reference/reference/webhooks
  if (isMondayChallenge(payload)) {
    return NextResponse.json({ challenge: payload.challenge }, { status: 200 });
  }

  try {
    const id = await saveWebhookPayload(payload);

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
