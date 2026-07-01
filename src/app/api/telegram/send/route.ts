import { NextResponse } from "next/server";
import { adminConfigured, supabaseAdmin, userIdFromRequest } from "@/lib/supabase-admin";

type TelegramPayload = {
  chatId?: string;
  text?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as TelegramPayload;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const userId = await userIdFromRequest(request);

  if (!adminConfigured) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required on the server." }, { status: 500 });
  }

  if (!botToken) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN is required on the server." }, { status: 500 });
  }

  if (!userId) {
    return NextResponse.json({ error: "Sign in before sending Telegram messages." }, { status: 401 });
  }

  if (!payload.text) {
    return NextResponse.json({ error: "text is required." }, { status: 400 });
  }

  const chatId = payload.chatId?.trim();

  if (!chatId) {
    return NextResponse.json({ error: "chatId is required." }, { status: 400 });
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: payload.text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    return NextResponse.json({ error: "Telegram request failed.", details: result }, { status: response.status });
  }

  await supabaseAdmin.from("profiles").upsert({
    id: userId,
    telegram_chat_id: chatId,
    telegram_connected: true,
    telegram_last_tested_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, result });
}
