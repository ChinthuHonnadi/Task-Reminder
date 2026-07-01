export type Priority = "low" | "medium" | "high";
export type RepeatUnit = "none" | "daily" | "weekday" | "weekly" | "monthly" | "yearly" | "custom";

export type Reminder = {
  id: string;
  label: string;
  minutesBefore: number;
  enabled: boolean;
};

export type Task = {
  id: string;
  userId?: string;
  title: string;
  description: string;
  notes: string;
  category: string;
  priority: Priority;
  tags: string[];
  dueDate: string;
  dueTime: string;
  duration: number;
  links: string[];
  files: string[];
  color: string;
  favorite: boolean;
  archived: boolean;
  completed: boolean;
  completedAt?: string;
  repeat: RepeatUnit;
  customEvery: number;
  customUnit: "days" | "weeks" | "months";
  reminders: Reminder[];
  nagMode: boolean;
  nagInterval: 15 | 30 | 60;
  sourceRecurringId?: string;
};

export type Note = {
  id: string;
  userId?: string;
  title: string;
  content: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SettingsState = {
  theme: "dark" | "light";
  accent: string;
  telegramChatId: string;
  telegramConnected: boolean;
  telegramLastTestedAt?: string;
  browserNotifications: boolean;
  defaultNagInterval: 15 | 30 | 60;
};

export type SupabaseTaskRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  notes: string | null;
  category: string | null;
  priority: Priority | null;
  tags: string[] | null;
  due_date: string | null;
  due_time: string | null;
  estimated_duration: number | null;
  links: string[] | null;
  files: string[] | null;
  color_label: string | null;
  favorite: boolean | null;
  archived: boolean | null;
  completed: boolean | null;
  completed_at: string | null;
  repeat_rule: {
    unit?: RepeatUnit;
    every?: number;
    customUnit?: "days" | "weeks" | "months";
  } | null;
  reminders: Reminder[] | null;
  nag_mode: boolean | null;
  nag_interval: 15 | 30 | 60 | null;
  source_recurring_id: string | null;
};

export type SupabaseNoteRow = {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  color: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type SupabaseProfileRow = {
  id: string;
  email?: string | null;
  telegram_chat_id?: string | null;
  telegram_connected?: boolean | null;
  telegram_last_tested_at?: string | null;
  accent?: string | null;
  theme?: "dark" | "light" | null;
  browser_notifications?: boolean | null;
  default_nag_interval?: 15 | 30 | 60 | null;
};

export const defaultReminders: Reminder[] = [
  { id: "r1", label: "1 day before", minutesBefore: 1440, enabled: true },
  { id: "r2", label: "6 hours before", minutesBefore: 360, enabled: false },
  { id: "r3", label: "1 hour before", minutesBefore: 60, enabled: true },
  { id: "r4", label: "30 minutes before", minutesBefore: 30, enabled: false },
  { id: "r5", label: "10 minutes before", minutesBefore: 10, enabled: false },
  { id: "r6", label: "At due time", minutesBefore: 0, enabled: true },
];

export const defaultSettings: SettingsState = {
  theme: "dark",
  accent: "#8FA3FF",
  telegramChatId: "",
  telegramConnected: false,
  browserNotifications: false,
  defaultNagInterval: 30,
};

export function toIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const todayIso = () => toIso(new Date());

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function taskFromRow(row: SupabaseTaskRow): Task {
  const repeatRule = row.repeat_rule || { unit: "none" };

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description || "",
    notes: row.notes || "",
    category: row.category || "Others",
    priority: row.priority || "medium",
    tags: row.tags || [],
    dueDate: row.due_date || todayIso(),
    dueTime: row.due_time?.slice(0, 5) || "18:00",
    duration: row.estimated_duration || 30,
    links: row.links || [],
    files: row.files || [],
    color: row.color_label || "#8FA3FF",
    favorite: Boolean(row.favorite),
    archived: Boolean(row.archived),
    completed: Boolean(row.completed),
    completedAt: row.completed_at || undefined,
    repeat: repeatRule.unit || "none",
    customEvery: repeatRule.every || 1,
    customUnit: repeatRule.customUnit || "days",
    reminders: row.reminders || defaultReminders,
    nagMode: Boolean(row.nag_mode),
    nagInterval: row.nag_interval || 30,
    sourceRecurringId: row.source_recurring_id || undefined,
  };
}

export function taskToInsert(task: Omit<Task, "id"> & { id?: string; userId: string }) {
  return {
    ...(task.id ? { id: task.id } : {}),
    user_id: task.userId,
    title: task.title,
    description: task.description,
    notes: task.notes,
    category: task.category,
    priority: task.priority,
    tags: task.tags,
    due_date: task.dueDate,
    due_time: task.dueTime,
    estimated_duration: task.duration,
    links: task.links,
    files: task.files,
    color_label: task.color,
    favorite: task.favorite,
    archived: task.archived,
    completed: task.completed,
    completed_at: task.completedAt || null,
    repeat_rule: { unit: task.repeat, every: task.customEvery, customUnit: task.customUnit },
    reminders: task.reminders,
    nag_mode: task.nagMode,
    nag_interval: task.nagInterval,
    source_recurring_id: task.sourceRecurringId || null,
  };
}

export function taskToUpdate(task: Task) {
  return {
    title: task.title,
    description: task.description,
    notes: task.notes,
    category: task.category,
    priority: task.priority,
    tags: task.tags,
    due_date: task.dueDate,
    due_time: task.dueTime,
    estimated_duration: task.duration,
    links: task.links,
    files: task.files,
    color_label: task.color,
    favorite: task.favorite,
    archived: task.archived,
    completed: task.completed,
    completed_at: task.completedAt || null,
    repeat_rule: { unit: task.repeat, every: task.customEvery, customUnit: task.customUnit },
    reminders: task.reminders,
    nag_mode: task.nagMode,
    nag_interval: task.nagInterval,
    source_recurring_id: task.sourceRecurringId || null,
    updated_at: new Date().toISOString(),
  };
}

export function noteFromRow(row: SupabaseNoteRow): Note {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || "Untitled note",
    content: row.content || "",
    color: row.color || "#8FA3FF",
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

export function noteToInsert(note: Omit<Note, "id"> & { id?: string; userId: string }) {
  return {
    ...(note.id ? { id: note.id } : {}),
    user_id: note.userId,
    title: note.title,
    content: note.content,
    color: note.color,
  };
}

export function noteToUpdate(note: Note) {
  return {
    title: note.title,
    content: note.content,
    color: note.color,
    updated_at: new Date().toISOString(),
  };
}

export function settingsFromProfile(profile?: SupabaseProfileRow | null): SettingsState {
  return {
    ...defaultSettings,
    theme: profile?.theme || defaultSettings.theme,
    accent: profile?.accent || defaultSettings.accent,
    telegramChatId: profile?.telegram_chat_id || "",
    telegramConnected: Boolean(profile?.telegram_connected),
    telegramLastTestedAt: profile?.telegram_last_tested_at || undefined,
    browserNotifications: Boolean(profile?.browser_notifications),
    defaultNagInterval: profile?.default_nag_interval || defaultSettings.defaultNagInterval,
  };
}

export function settingsToProfile(settings: SettingsState, userId: string, email?: string | null) {
  return {
    id: userId,
    email,
    telegram_chat_id: settings.telegramChatId || null,
    telegram_connected: settings.telegramConnected,
    telegram_last_tested_at: settings.telegramLastTestedAt || null,
    accent: settings.accent,
    theme: settings.theme,
    browser_notifications: settings.browserNotifications,
    default_nag_interval: settings.defaultNagInterval,
  };
}

export function dueDateTime(task: Pick<Task, "dueDate" | "dueTime">) {
  return new Date(`${task.dueDate}T${task.dueTime || "23:59"}:00`);
}

export function isRecurringDueOn(task: Task, date: Date) {
  if (task.repeat === "none" || task.sourceRecurringId) return false;
  const original = new Date(`${task.dueDate}T00:00:00`);
  const diff = Math.floor((date.getTime() - original.getTime()) / 86400000);

  if (diff < 0) return false;

  if (task.repeat === "daily") return true;
  if (task.repeat === "weekday") return date.getDay() > 0 && date.getDay() < 6;
  if (task.repeat === "weekly") return diff % 7 === 0;
  if (task.repeat === "monthly") return date.getDate() === original.getDate();
  if (task.repeat === "yearly") return date.getDate() === original.getDate() && date.getMonth() === original.getMonth();
  if (task.repeat === "custom") {
    const multiplier = task.customUnit === "weeks" ? 7 : task.customUnit === "months" ? 30 : 1;
    return diff % (task.customEvery * multiplier) === 0;
  }

  return false;
}

export function reminderTimes(task: Task) {
  const due = dueDateTime(task);
  const offsets = task.reminders.filter((reminder) => reminder.enabled).map((reminder) => reminder.minutesBefore);

  return offsets.map((minutesBefore) => ({
    minutesBefore,
    scheduledFor: new Date(due.getTime() - minutesBefore * 60000).toISOString(),
  }));
}
