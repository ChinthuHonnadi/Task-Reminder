import { NextResponse } from "next/server";
import { adminConfigured, supabaseAdmin } from "@/lib/supabase-admin";
import { dueDateTime, reminderTimes, taskFromRow, type SupabaseProfileRow, type SupabaseTaskRow, type Task } from "@/lib/planner";

export const dynamic = "force-dynamic";

type DeliveryInsert = {
  task_id: string;
  user_id: string;
  channel: "telegram";
  scheduled_for: string;
  status: "pending";
};

const LOOKBACK_HOURS = 48;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (cronSecret && authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  if (!adminConfigured) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required." }, { status: 500 });
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN is required." }, { status: 500 });
  }

  const now = new Date();
  const lookback = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);
  const today = now.toISOString().slice(0, 10);

  const [{ data: profiles, error: profileError }, { data: rows, error: taskError }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("telegram_connected", true)
      .not("telegram_chat_id", "is", null)
      .returns<SupabaseProfileRow[]>(),
    supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("archived", false)
      .eq("completed", false)
      .lte("due_date", today)
      .returns<SupabaseTaskRow[]>(),
  ]);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });

  const profileByUser = new Map((profiles || []).map((profile) => [profile.id, profile]));
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows || []) {
    const profile = profileByUser.get(row.user_id);
    if (!profile?.telegram_chat_id) {
      skipped += 1;
      continue;
    }

    const task = taskFromRow(row) as Task;
    const dueDeliveries = reminderTimes(task)
      .map(({ scheduledFor }) => scheduledFor)
      .filter((scheduledFor) => isDueWindow(scheduledFor, lookback, now));
    const nagDelivery = nagScheduledFor(task, lookback, now);
    const scheduledForValues = [...dueDeliveries, ...(nagDelivery ? [nagDelivery] : [])];

    for (const scheduledFor of scheduledForValues) {
      const delivery = await reserveDelivery({
        task_id: task.id,
        user_id: row.user_id,
        channel: "telegram",
        scheduled_for: scheduledFor,
        status: "pending",
      });

      if (!delivery) {
        skipped += 1;
        continue;
      }

      const sentOk = await sendTelegram(profile.telegram_chat_id, formatReminder(task, scheduledFor));

      await supabaseAdmin
        .from("reminder_deliveries")
        .update({
          status: sentOk ? "delivered" : "failed",
          delivered_at: sentOk ? new Date().toISOString() : null,
        })
        .eq("id", delivery.id);

      if (sentOk) sent += 1;
      else failed += 1;
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, failed });
}

function isDueWindow(iso: string, lookback: Date, now: Date) {
  const date = new Date(iso);
  return date.getTime() <= now.getTime() && date.getTime() >= lookback.getTime();
}

function nagScheduledFor(task: Task, lookback: Date, now: Date) {
  if (!task.nagMode) return null;

  const due = dueDateTime(task);
  if (due.getTime() > now.getTime()) return null;

  const intervalMs = task.nagInterval * 60 * 1000;
  const elapsedSlots = Math.floor((now.getTime() - due.getTime()) / intervalMs);
  const slot = new Date(due.getTime() + elapsedSlots * intervalMs);

  if (slot.getTime() < lookback.getTime()) return null;
  return slot.toISOString();
}

async function reserveDelivery(delivery: DeliveryInsert) {
  const { data, error } = await supabaseAdmin
    .from("reminder_deliveries")
    .upsert(delivery, {
      onConflict: "task_id,user_id,channel,scheduled_for",
      ignoreDuplicates: true,
    })
    .select("id")
    .maybeSingle();

  if (error) return null;
  return data;
}

async function sendTelegram(chatId: string, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
  });

  return response.ok;
}

function formatReminder(task: Task, scheduledFor: string) {
  return [
    "*Quiet Planner reminder*",
    "",
    `Task: ${escapeMarkdown(task.title)}`,
    `Due: ${task.dueDate} ${task.dueTime}`,
    `Reminder: ${new Date(scheduledFor).toLocaleString("en-US", { timeZone: "UTC" })} UTC`,
  ].join("\n");
}

function escapeMarkdown(value: string) {
  return value.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
