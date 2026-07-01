import { NextResponse } from "next/server";
import { saveWebhookPayload } from "@/lib/db";

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
