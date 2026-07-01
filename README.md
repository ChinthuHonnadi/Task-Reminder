# Quiet Planner

A personal productivity planner built with Next.js, TypeScript, Tailwind CSS, Supabase, Telegram reminders, Vercel Cron Jobs, and PWA support.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Create `.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TELEGRAM_BOT_TOKEN=
CRON_SECRET=
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported for older Supabase projects, but the publishable key name is preferred.

## Supabase Setup

Run `supabase.sql` before using the production backend:

1. Open your Supabase project dashboard.
2. Go to **SQL Editor**.
3. Click **New query**.
4. Open this repo's `supabase.sql`, copy the full contents, and paste it into the Supabase SQL editor.
5. Click **Run**.
6. Go to **Authentication > URL Configuration** and add:
   - Local: `http://localhost:3000`
   - Production: your Vercel URL after deployment.
7. Go to **Authentication > Providers > Email** and enable Email sign-in.
8. Keep **Confirm email** enabled if you want Supabase to send Magic Link emails.

The SQL creates `profiles`, `tasks`, `categories`, `reminder_deliveries`, RLS policies, indexes, updated-at triggers, a new-user profile trigger, and realtime publication entries for task/profile sync.

## How Sync Works

Users sign in with Supabase Email Magic Links. If the email does not already belong to a user, Supabase creates the account automatically. Tasks are stored in Supabase under the signed-in user's `auth.uid()`. The browser subscribes to Supabase realtime changes for that user's tasks and profile, so another signed-in device receives inserts, updates, completions, and settings changes.

To verify manually:

1. Run the SQL.
2. Start the app locally.
3. Sign in with the same Supabase user in two browsers or on two devices.
4. Add a task on device A.
5. Confirm it appears on device B without importing/exporting.
6. Complete or favorite the task on device B.
7. Confirm device A updates.

## Telegram Reminders

Telegram uses a server-side `TELEGRAM_BOT_TOKEN`. In Settings, save your Telegram Chat ID, then click **Send Test Telegram Message**.

The test button calls `POST /api/telegram/send` with your Supabase session token. The server sends the message and marks Telegram as connected in your profile.

## Vercel Cron

`vercel.json` schedules:

```json
{
  "path": "/api/cron/reminders",
  "schedule": "*/5 * * * *"
}
```

The cron endpoint scans due tasks for Telegram-connected profiles, reserves unique reminder delivery rows, sends messages, and marks each delivery as `delivered` or `failed`. This keeps reminders running on Vercel even when your laptop is off.

Set these Vercel environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TELEGRAM_BOT_TOKEN=
CRON_SECRET=
```

## Verification

```bash
npm run lint
npm run build
```
