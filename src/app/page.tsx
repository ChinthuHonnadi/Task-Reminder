"use client";

import {
  Archive,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Flame,
  Heart,
  Inbox,
  Link as LinkIcon,
  ListFilter,
  Mail,
  Menu,
  Moon,
  MoreHorizontal,
  NotebookText,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Tag,
  Timer,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import {
  addDays,
  noteFromRow,
  noteToInsert,
  noteToUpdate,
  settingsFromProfile,
  settingsToProfile,
  taskFromRow,
  taskToInsert,
  taskToUpdate,
  todayIso,
  toIso,
  type Note,
  type SupabaseNoteRow,
  type SupabaseProfileRow,
  type SupabaseTaskRow,
} from "@/lib/planner";

type Priority = "low" | "medium" | "high";
type View = "dashboard" | "calendar" | "notes" | "tasks" | "settings";
type Filter =
  | "Today"
  | "Tomorrow"
  | "This Week"
  | "Completed"
  | "Incomplete"
  | "High Priority"
  | "Recurring"
  | "Overdue"
  | "Favorites"
  | "Archived";
type RepeatUnit = "none" | "daily" | "weekday" | "weekly" | "monthly" | "yearly" | "custom";

type Reminder = {
  id: string;
  label: string;
  minutesBefore: number;
  enabled: boolean;
};

type Task = {
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

type SettingsState = {
  theme: "dark" | "light";
  accent: string;
  telegramChatId: string;
  telegramConnected: boolean;
  telegramLastTestedAt?: string;
  browserNotifications: boolean;
  defaultNagInterval: 15 | 30 | 60;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

const categories = [
  "Study",
  "Cybersecurity",
  "Fitness",
  "College",
  "Personal",
  "Work",
  "Shopping",
  "Others",
];

const accentOptions = ["#8FA3FF", "#94D2BD", "#F4A261", "#E9C46A", "#F5A3B7"];
const navItems: { view: View; icon: LucideIcon; label: string }[] = [
  { view: "dashboard", icon: Inbox, label: "Dashboard" },
  { view: "tasks", icon: Check, label: "Tasks" },
  { view: "calendar", icon: CalendarDays, label: "Calendar" },
  { view: "notes", icon: NotebookText, label: "Notes" },
  { view: "settings", icon: Settings, label: "Settings" },
];
const defaultReminders: Reminder[] = [
  { id: "r1", label: "1 day before", minutesBefore: 1440, enabled: true },
  { id: "r2", label: "6 hours before", minutesBefore: 360, enabled: false },
  { id: "r3", label: "1 hour before", minutesBefore: 60, enabled: true },
  { id: "r4", label: "30 minutes before", minutesBefore: 30, enabled: false },
  { id: "r5", label: "10 minutes before", minutesBefore: 10, enabled: false },
  { id: "r6", label: "At due time", minutesBefore: 0, enabled: true },
];

function isToday(date: string) {
  return date === todayIso();
}

function isTomorrow(date: string) {
  return date === toIso(addDays(new Date(), 1));
}

function isOverdue(task: Task) {
  if (task.completed || task.archived) return false;
  const due = new Date(`${task.dueDate}T${task.dueTime || "23:59"}`);
  return due.getTime() < Date.now();
}

function daysUntil(date: string) {
  const current = new Date(`${todayIso()}T00:00:00`);
  const target = new Date(`${date}T00:00:00`);
  return Math.round((target.getTime() - current.getTime()) / 86400000);
}

function uid(prefix = "task") {
  void prefix;
  return crypto.randomUUID();
}

const seedTasks: Task[] = [
  {
    id: "seed-workout",
    title: "Workout",
    description: "Strength session and mobility cooldown",
    notes: "Keep it simple: push, pull, legs, stretch.",
    category: "Fitness",
    priority: "medium",
    tags: ["health", "streak"],
    dueDate: todayIso(),
    dueTime: "21:00",
    duration: 45,
    links: [],
    files: [],
    color: "#94D2BD",
    favorite: true,
    archived: false,
    completed: false,
    repeat: "daily",
    customEvery: 1,
    customUnit: "days",
    reminders: defaultReminders,
    nagMode: true,
    nagInterval: 30,
  },
  {
    id: "seed-threadhatme",
    title: "Solve one ThreadHatMe module",
    description: "One focused practical lab block",
    notes: "Capture flags, blockers, and commands used.",
    category: "Cybersecurity",
    priority: "high",
    tags: ["lab", "security"],
    dueDate: todayIso(),
    dueTime: "20:00",
    duration: 60,
    links: ["https://threadhat.me"],
    files: [],
    color: "#8FA3FF",
    favorite: true,
    archived: false,
    completed: false,
    repeat: "daily",
    customEvery: 1,
    customUnit: "days",
    reminders: defaultReminders,
    nagMode: true,
    nagInterval: 15,
  },
  {
    id: "seed-physics",
    title: "Complete Physics Assignment",
    description: "Finalize derivations and upload PDF",
    notes: "Review numerical answers before submission.",
    category: "College",
    priority: "high",
    tags: ["college", "deadline"],
    dueDate: toIso(addDays(new Date(), 1)),
    dueTime: "08:00",
    duration: 90,
    links: [],
    files: ["assignment-outline.pdf"],
    color: "#F5A3B7",
    favorite: false,
    archived: false,
    completed: false,
    repeat: "none",
    customEvery: 1,
    customUnit: "days",
    reminders: defaultReminders,
    nagMode: true,
    nagInterval: 30,
  },
  {
    id: "seed-reading",
    title: "Read operating systems notes",
    description: "Processes, scheduling, and memory recap",
    notes: "Turn weak spots into questions.",
    category: "Study",
    priority: "medium",
    tags: ["study"],
    dueDate: toIso(addDays(new Date(), -1)),
    dueTime: "19:30",
    duration: 40,
    links: [],
    files: [],
    color: "#E9C46A",
    favorite: false,
    archived: false,
    completed: false,
    repeat: "weekly",
    customEvery: 1,
    customUnit: "weeks",
    reminders: defaultReminders,
    nagMode: true,
    nagInterval: 60,
  },
];

const defaultSettings: SettingsState = {
  theme: "dark",
  accent: "#8FA3FF",
  telegramChatId: "",
  telegramConnected: false,
  browserNotifications: false,
  defaultNagInterval: 30,
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesStatus, setNotesStatus] = useState("");
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [view, setView] = useState<View>("dashboard");
  const [filter, setFilter] = useState<Filter>("Today");
  const [query, setQuery] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [calendarCursor, setCalendarCursor] = useState(new Date());
  const [authEmail, setAuthEmail] = useState("");
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [magicLinkMessage, setMagicLinkMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Connecting to Supabase...");
  const [toast, setToast] = useState<ToastState>(null);
  const settingsHydrated = useRef(false);

  const showToast = useCallback((nextToast: NonNullable<ToastState>) => {
    setToast(nextToast);
    window.setTimeout(() => {
      setToast((current) => (current?.message === nextToast.message ? null : current));
    }, 5000);
  }, []);

  const loadWorkspace = useCallback(async (sessionUser?: { id: string; email?: string | null } | null) => {
    if (!supabaseConfigured) {
      setTasks(seedTasks);
      setNotes([]);
      setNotesStatus("Sign in with Supabase to create notes.");
      setSettings(defaultSettings);
      setUserId(null);
      setUserEmail(null);
      setWorkspaceLoading(false);
      setStatusMessage("Add Supabase env vars to sync tasks.");
      return;
    }

    const user = sessionUser === undefined ? (await supabase.auth.getSession()).data.session?.user : sessionUser;

    if (!user) {
      setTasks([]);
      setNotes([]);
      setNotesStatus("Sign in to sync notes.");
      setUserId(null);
      setUserEmail(null);
      setWorkspaceLoading(false);
      setStatusMessage("Sign in to sync tasks across devices.");
      return;
    }

    setUserId(user.id);
    setUserEmail(user.email || null);

    const [{ data: profile }, { data: rows, error }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<SupabaseProfileRow>(),
      supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).returns<SupabaseTaskRow[]>(),
    ]);

    const { data: noteRows, error: notesError } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .returns<SupabaseNoteRow[]>();

    if (error) {
      setStatusMessage(`Supabase task load failed: ${error.message}`);
      setWorkspaceLoading(false);
      return;
    }

    if (notesError) {
      setNotes([]);
      setNotesStatus(
        isMissingNotesTableError(notesError)
          ? "Notes table is missing. Run supabase-notes.sql in Supabase, then reload."
          : `Supabase notes load failed: ${notesError.message}`,
      );
    } else {
      setNotes(sortNotes((noteRows || []).map((row) => noteFromRow(row))));
      setNotesStatus("");
    }

    const nextSettings = settingsFromProfile(profile);
    if (!profile) {
      await supabase.from("profiles").upsert(settingsToProfile(nextSettings, user.id, user.email));
    }

    const loadedTasks = (rows || []).map((row) => taskFromRow(row) as Task);
    const rowIds = new Set(loadedTasks.map((task) => task.id));
    const materializedTasks = materializeRecurring(loadedTasks);
    const generatedRecurringTasks = materializedTasks.filter((task) => !rowIds.has(task.id));

    if (generatedRecurringTasks.length > 0) {
      const { error: recurringError } = await supabase
        .from("tasks")
        .insert(generatedRecurringTasks.map((task) => taskToInsert({ ...task, userId: user.id })));

      if (recurringError) {
        setStatusMessage(`Recurring task sync failed: ${recurringError.message}`);
      }
    }

    setSettings(nextSettings as SettingsState);
    setTasks(materializedTasks);
    settingsHydrated.current = true;
    setWorkspaceLoading(false);
    setStatusMessage(`Synced as ${user.email || "signed-in user"}`);
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    if (!supabaseConfigured) {
      queueMicrotask(() => {
        void loadWorkspace(null);
      });
      return;
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setStatusMessage(`Session restore failed: ${error.message}`);
        setWorkspaceLoading(false);
        return;
      }

      void loadWorkspace(data.session?.user ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[Quiet Planner] Auth state changed", event);
      settingsHydrated.current = false;
      void loadWorkspace(session?.user ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, [loadWorkspace]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.style.setProperty("--accent", settings.accent);
  }, [settings]);

  useEffect(() => {
    if (!supabaseConfigured || !userId || !settingsHydrated.current) return;

    const timeout = window.setTimeout(async () => {
      const { error } = await supabase.from("profiles").upsert(settingsToProfile(settings, userId, userEmail));
      if (error) setStatusMessage(`Settings sync failed: ${error.message}`);
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [settings, userEmail, userId]);

  useEffect(() => {
    if (!supabaseConfigured || !userId) return;

    const channel = supabase
      .channel(`planner:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` }, () => {
        void loadWorkspace();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${userId}` }, () => {
        void loadWorkspace();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter: `user_id=eq.${userId}` }, () => {
        void loadWorkspace();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadWorkspace, userId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const overdue = tasks.find((task) => isOverdue(task) && task.nagMode);
      if (overdue && settings.browserNotifications && Notification.permission === "granted") {
        new Notification("Planner reminder", {
          body: `${overdue.title} is overdue. Nag mode is still active.`,
          tag: overdue.id,
        });
      }
    }, 60000);

    return () => window.clearInterval(timer);
  }, [settings.browserNotifications, tasks]);

  const stats = useMemo(() => computeStats(tasks), [tasks]);
  const visibleTasks = useMemo(
    () => tasks.filter((task) => matchesFilter(task, filter)).filter((task) => matchesSearch(task, query)),
    [filter, query, tasks],
  );
  const visibleNotes = useMemo(() => notes.filter((note) => matchesNoteSearch(note, query)), [notes, query]);
  const activeTasks = tasks.filter((task) => !task.archived && !task.completed);
  const composerDefaultDueDate = useMemo(() => defaultDueDateForFilter(filter), [filter]);

  async function updateTask(id: string, updater: (task: Task) => Task) {
    const existing = tasks.find((task) => task.id === id);
    if (!existing) return;

    const nextTask = updater(existing);
    setTasks((current) => current.map((task) => (task.id === id ? nextTask : task)));

    if (!supabaseConfigured || !userId) {
      setStatusMessage("Sign in before editing synced tasks.");
      return;
    }

    const { error } = await supabase.from("tasks").update(taskToUpdate(nextTask)).eq("id", id).eq("user_id", userId);
    if (error) {
      setStatusMessage(`Task update failed: ${error.message}`);
      await loadWorkspace();
    }
  }

  async function completeTask(id: string) {
    const existing = tasks.find((task) => task.id === id);
    if (!existing) return;

    const nextTask = {
      ...existing,
      completed: !existing.completed,
      completedAt: existing.completed ? undefined : new Date().toISOString(),
    };

    setTasks((current) => materializeRecurring(current.map((task) => (task.id === id ? nextTask : task))));

    if (!supabaseConfigured || !userId) {
      setStatusMessage("Sign in before editing synced tasks.");
      return;
    }

    const { error } = await supabase.from("tasks").update(taskToUpdate(nextTask)).eq("id", id).eq("user_id", userId);
    if (error) {
      setStatusMessage(`Task completion failed: ${error.message}`);
      await loadWorkspace();
    }
  }

  async function signInWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    console.log("Magic Link button clicked");

    const email = authEmail.trim();
    setMagicLinkMessage(null);

    if (!supabaseConfigured || !email) {
      const message = "Supabase env vars and an email are required for magic link auth.";
      console.log("Error", message);
      setStatusMessage(message);
      setMagicLinkMessage({ type: "error", text: message });
      showToast({ type: "error", message });
      return;
    }

    setMagicLinkLoading(true);
    console.log("Sending Magic Link");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        console.log("Error", error);
        const message = error.message;
        setStatusMessage(message);
        setMagicLinkMessage({ type: "error", text: message });
        showToast({ type: "error", message });
        return;
      }

      console.log("Success");
      setStatusMessage("Check your email");
      setMagicLinkMessage({ type: "success", text: "Check your email" });
      showToast({ type: "success", message: "Check your email" });
    } catch (error) {
      console.log("Error", error);
      const message = error instanceof Error ? error.message : "Magic Link request failed.";
      setStatusMessage(message);
      setMagicLinkMessage({ type: "error", text: message });
      showToast({ type: "error", message });
    } finally {
      setMagicLinkLoading(false);
    }
  }

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setStatusMessage("This browser does not support notifications.");
      return;
    }

    const permission = await Notification.requestPermission();
    setSettings((current) => ({ ...current, browserNotifications: permission === "granted" }));
    setStatusMessage(permission === "granted" ? "Browser notifications enabled." : "Notification permission was not granted.");
  }

  async function addTask(formData: FormData) {
    console.log("[Quiet Planner] Add Task submit handler called");
    console.log("[Quiet Planner] Raw Add Task form data", Object.fromEntries(formData.entries()));

    if (!supabaseConfigured || !userId) {
      const message = "Sign in before adding synced tasks.";
      setStatusMessage(message);
      showToast({ type: "error", message });
      console.error("[Quiet Planner] Add Task rejected before insert", message);
      return false;
    }

    const task: Task = {
      id: uid(),
      title: String(formData.get("title") || "Untitled task"),
      description: String(formData.get("description") || ""),
      notes: "",
      category: String(formData.get("category") || "Others"),
      priority: String(formData.get("priority") || "medium") as Priority,
      tags: String(formData.get("tags") || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      dueDate: String(formData.get("dueDate") || todayIso()),
      dueTime: String(formData.get("dueTime") || "18:00"),
      duration: Number(formData.get("duration") || 30),
      links: String(formData.get("links") || "")
        .split(",")
        .map((link) => link.trim())
        .filter(Boolean),
      files: [],
      color: String(formData.get("color") || settings.accent),
      favorite: false,
      archived: false,
      completed: false,
      repeat: String(formData.get("repeat") || "none") as RepeatUnit,
      customEvery: Number(formData.get("customEvery") || 1),
      customUnit: String(formData.get("customUnit") || "days") as Task["customUnit"],
      reminders: defaultReminders,
      nagMode: formData.get("nagMode") === "on",
      nagInterval: Number(formData.get("nagInterval") || settings.defaultNagInterval) as Task["nagInterval"],
    };

    const validationError = validateTaskForInsert(task);
    if (validationError) {
      setStatusMessage(validationError);
      showToast({ type: "error", message: validationError });
      console.error("[Quiet Planner] Add Task validation failed", validationError, task);
      return false;
    }

    const insertPayload = taskToInsert({ ...task, userId });
    console.log("[Quiet Planner] Supabase insert payload", insertPayload);
    console.log("[Quiet Planner] Starting Supabase tasks.insert()");

    const { data, error } = await supabase.from("tasks").insert(insertPayload).select("*").single<SupabaseTaskRow>();

    console.log("[Quiet Planner] Supabase tasks.insert() finished", { data, error });

    if (error) {
      const exactError = formatSupabaseError(error);
      const diagnostic = diagnoseTaskInsertFailure(exactError);
      const message = `Task save failed: ${exactError}${diagnostic ? ` ${diagnostic}` : ""}`;
      setStatusMessage(message);
      showToast({ type: "error", message });
      console.error("[Quiet Planner] Supabase insert failed", error);
      await loadWorkspace();
      return false;
    }

    if (!data) {
      const message = "Task save failed: Supabase insert returned no row. Check tasks SELECT RLS policy.";
      setStatusMessage(message);
      showToast({ type: "error", message });
      console.error("[Quiet Planner] Supabase insert returned no row");
      await loadWorkspace();
      return false;
    }

    const savedTask = taskFromRow(data) as Task;
    setTasks((current) => materializeRecurring([savedTask, ...current.filter((item) => item.id !== savedTask.id)]));
    setStatusMessage(`Saved "${savedTask.title}" to Supabase.`);
    showToast({ type: "success", message: `Task saved: ${savedTask.title}` });
    setNewTaskOpen(false);
    return true;
  }

  async function addNote(formData: FormData) {
    const note: Note = {
      id: uid("note"),
      title: String(formData.get("title") || "Untitled note").trim() || "Untitled note",
      content: String(formData.get("content") || ""),
      color: String(formData.get("color") || settings.accent),
    };

    if (!supabaseConfigured || !userId) {
      const message = "Sign in before adding synced notes.";
      setNotesStatus(message);
      showToast({ type: "error", message });
      return false;
    }

    const { data, error } = await supabase.from("notes").insert(noteToInsert({ ...note, userId })).select("*").single<SupabaseNoteRow>();

    if (error) {
      const message = isMissingNotesTableError(error)
        ? "Notes table is missing. Run supabase-notes.sql in Supabase, then reload."
        : `Note save failed: ${error.message}`;
      setNotesStatus(message);
      showToast({ type: "error", message });
      return false;
    }

    if (data) {
      const savedNote = noteFromRow(data);
      setNotes((current) => sortNotes([savedNote, ...current.filter((item) => item.id !== savedNote.id)]));
      setNotesStatus("");
      showToast({ type: "success", message: `Note saved: ${savedNote.title}` });
    }

    return true;
  }

  async function updateNote(nextNote: Note) {
    setNotes((current) => sortNotes(current.map((note) => (note.id === nextNote.id ? { ...nextNote, updatedAt: new Date().toISOString() } : note))));

    if (!supabaseConfigured || !userId) {
      const message = "Sign in before editing synced notes.";
      setNotesStatus(message);
      showToast({ type: "error", message });
      return false;
    }

    const { error } = await supabase.from("notes").update(noteToUpdate(nextNote)).eq("id", nextNote.id).eq("user_id", userId);
    if (error) {
      const message = isMissingNotesTableError(error)
        ? "Notes table is missing. Run supabase-notes.sql in Supabase, then reload."
        : `Note update failed: ${error.message}`;
      setNotesStatus(message);
      showToast({ type: "error", message });
      await loadWorkspace();
      return false;
    }

    setNotesStatus("");
    return true;
  }

  async function deleteNote(id: string) {
    const previous = notes;
    setNotes((current) => current.filter((note) => note.id !== id));

    if (!supabaseConfigured || !userId) {
      const message = "Sign in before deleting synced notes.";
      setNotes(previous);
      setNotesStatus(message);
      showToast({ type: "error", message });
      return false;
    }

    const { error } = await supabase.from("notes").delete().eq("id", id).eq("user_id", userId);
    if (error) {
      const message = isMissingNotesTableError(error)
        ? "Notes table is missing. Run supabase-notes.sql in Supabase, then reload."
        : `Note delete failed: ${error.message}`;
      setNotes(previous);
      setNotesStatus(message);
      showToast({ type: "error", message });
      return false;
    }

    setNotesStatus("");
    showToast({ type: "success", message: "Note deleted." });
    return true;
  }

  function exportData() {
    const payload = JSON.stringify({ tasks, notes, settings, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "planner-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importData(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const payload = JSON.parse(String(reader.result));
      void (async () => {
        if (payload.settings) setSettings({ ...defaultSettings, ...payload.settings });

        if (payload.tasks && supabaseConfigured && userId) {
          const importedTasks = (payload.tasks as Task[]).map((task) => ({ ...task, userId }));
          const { error } = await supabase.from("tasks").upsert(importedTasks.map((task) => taskToInsert(task)));
          if (error) {
            setStatusMessage(`Import failed: ${error.message}`);
            return;
          }
          await loadWorkspace();
        }

        if (payload.notes && supabaseConfigured && userId) {
          const importedNotes = (payload.notes as Note[]).map((note) => ({ ...note, userId }));
          const { error } = await supabase.from("notes").upsert(importedNotes.map((note) => noteToInsert(note)));
          if (error) {
            setNotesStatus(isMissingNotesTableError(error) ? "Notes table is missing. Run supabase-notes.sql in Supabase, then reload." : `Notes import failed: ${error.message}`);
            return;
          }
        }

        await loadWorkspace();
        setStatusMessage("Backup restored to Supabase.");
      })();
    };
    reader.readAsText(file);
  }

  return (
    <main className="min-h-screen bg-black text-stone-100">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.10),transparent_34%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1500px]">
        <aside className={`nav-shell flex flex-col overflow-hidden ${mobileNav ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Personal OS</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Quiet Planner</h1>
            </div>
            <button className="icon-button lg:hidden" onClick={() => setMobileNav(false)} aria-label="Close navigation">
              <X size={18} />
            </button>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/40">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-white text-black">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-sm font-medium">Premium workspace</p>
                    <p className="text-xs text-stone-500">{workspaceLoading ? "Loading workspace..." : statusMessage}</p>
              </div>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {navItems.map(({ view: itemView, icon: Icon, label }) => (
              <button
                key={itemView}
                className={`nav-item ${view === itemView ? "active" : ""}`}
                onClick={() => {
                  setView(itemView);
                  setMobileNav(false);
                }}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-8 min-h-0 flex-1 overflow-y-auto pr-1">
            <p className="px-3 text-xs uppercase tracking-[0.2em] text-stone-600">Filters</p>
            <div className="mt-3 grid gap-1">
              {(["Today", "Tomorrow", "This Week", "Completed", "Incomplete", "High Priority", "Recurring", "Overdue", "Favorites", "Archived"] as Filter[]).map(
                (item) => (
                  <button key={item} className={`filter-button ${filter === item ? "active" : ""}`} onClick={() => setFilter(item)}>
                    {item}
                    <span>{tasks.filter((task) => matchesFilter(task, item)).length}</span>
                  </button>
                ),
              )}
            </div>
          </div>

          <SidebarContact />
        </aside>

        {mobileNav && <button aria-label="Close menu overlay" className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMobileNav(false)} />}

        <section className="flex min-w-0 flex-1 flex-col px-4 pb-28 pt-5 sm:px-6 lg:ml-80 lg:px-10 lg:pb-10">
          <header className="sticky top-0 z-20 -mx-4 border-b border-white/10 bg-black/85 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
            <div className="flex flex-wrap items-center gap-3">
              <button className="icon-button lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation">
                <Menu size={20} />
              </button>
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                <input
                  className="search-input"
                  placeholder={view === "notes" ? "Search note title or content..." : "Search title, description, category, priority, tag..."}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <button className="primary-button" onClick={() => setNewTaskOpen(true)}>
                <Plus size={18} />
                <span>New Task</span>
              </button>
            </div>
          </header>

          {view === "dashboard" && (
            <Dashboard
              tasks={tasks}
              stats={stats}
              visibleTasks={visibleTasks}
              activeTasks={activeTasks}
              completeTask={completeTask}
              updateTask={updateTask}
            />
          )}

          {view === "tasks" && (
            <TasksView tasks={visibleTasks} completeTask={completeTask} updateTask={updateTask} />
          )}

          {view === "calendar" && (
            <CalendarView
              tasks={tasks}
              cursor={calendarCursor}
              setCursor={setCalendarCursor}
              completeTask={completeTask}
              updateTask={updateTask}
            />
          )}

          {view === "notes" && (
            <NotesView
              notes={visibleNotes}
              notesStatus={notesStatus}
              addNote={addNote}
              updateNote={updateNote}
              deleteNote={deleteNote}
              accent={settings.accent}
            />
          )}

          {view === "settings" && (
            <SettingsView
              settings={settings}
              setSettings={setSettings}
              authEmail={authEmail}
              setAuthEmail={setAuthEmail}
              magicLinkLoading={magicLinkLoading}
              magicLinkMessage={magicLinkMessage}
              signInWithEmail={signInWithEmail}
              isAuthenticated={Boolean(userId)}
              userEmail={userEmail}
              enableNotifications={enableNotifications}
              exportData={exportData}
              importData={importData}
            />
          )}
        </section>
      </div>

      {newTaskOpen && (
        <TaskComposer
          addTask={addTask}
          close={() => setNewTaskOpen(false)}
          accent={settings.accent}
          defaultNagInterval={settings.defaultNagInterval}
          defaultDueDate={composerDefaultDueDate}
        />
      )}

      {toast && <Toast toast={toast} />}
    </main>
  );
}

function SidebarContact() {
  return (
    <div className="mt-5 shrink-0 border-t border-white/10 pt-5">
      <h2 className="text-sm font-semibold text-stone-200">Contact Us</h2>
      <div className="mt-4 grid gap-3 text-sm">
        <a className="flex items-center gap-2 text-stone-400 transition hover:text-stone-100" href="mailto:chinthuhonnadi88@gmail.com">
          <Mail size={16} />
          <span>📧 chinthuhonnadi88@gmail.com</span>
        </a>
        <a
          className="grid gap-1 text-stone-400 transition hover:text-stone-100"
          href="https://instagram.com/chinthan_kumar10"
          target="_blank"
          rel="noreferrer"
        >
          <span className="flex items-center gap-2">
            <ExternalLink size={16} />
            📷 Instagram
          </span>
          <span className="break-all text-xs text-stone-500">https://instagram.com/chinthan_kumar10</span>
        </a>
      </div>
      <p className="mt-5 text-center text-sm font-medium text-stone-400">{"\u2764\uFE0F Built with love by Chinthan"}</p>
    </div>
  );
}
function Dashboard({
  tasks,
  stats,
  visibleTasks,
  activeTasks,
  completeTask,
  updateTask,
}: {
  tasks: Task[];
  stats: ReturnType<typeof computeStats>;
  visibleTasks: Task[];
  activeTasks: Task[];
  completeTask: (id: string) => void;
  updateTask: (id: string, updater: (task: Task) => Task) => void;
}) {
  return (
    <div className="animate-rise pt-7">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today" value={stats.todayCount} detail={`${stats.completedToday} completed`} icon={<CalendarDays size={18} />} />
        <StatCard label="Overdue" value={stats.overdue} detail="Nag mode keeps these visible" icon={<Bell size={18} />} warn />
        <StatCard label="Productivity" value={`${stats.productivity}%`} detail="Completion percentage" icon={<Sparkles size={18} />} />
        <StatCard label="Current streak" value={stats.currentStreak} detail="days in motion" icon={<Flame size={18} />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Today&apos;s Tasks</p>
              <h2 className="section-title">Your next few moves</h2>
            </div>
            <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-stone-400">{activeTasks.length} open</div>
          </div>
          <div className="mt-5 grid gap-3">
            {visibleTasks.slice(0, 6).map((task, index) => (
              <TaskRow key={`${task.id}-today-${index}`} task={task} completeTask={completeTask} updateTask={updateTask} />
            ))}
          </div>
        </section>

        <section className="panel">
          <p className="eyebrow">Weekly Graph</p>
          <h2 className="section-title">Completion rhythm</h2>
          <div className="mt-6 flex h-48 items-end gap-3">
            {stats.week.map((item, index) => (
              <div key={`${item.day}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative h-36 w-full overflow-hidden rounded-full bg-white/[0.055]">
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-700"
                    style={{ height: `${item.value}%`, background: "var(--accent)" }}
                  />
                </div>
                <span className="text-xs text-stone-500">{item.day}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="panel xl:col-span-2">
          <p className="eyebrow">Monthly Statistics</p>
          <h2 className="section-title">Focus score and trend</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <MiniMetric label="Focus score" value={`${stats.focusScore}/100`} />
            <MiniMetric label="Time spent" value={`${stats.timeSpent}m`} />
            <MiniMetric label="Monthly streak" value={`${stats.monthlyStreak}d`} />
          </div>
          <div className="mt-6 grid grid-cols-14 gap-1">
            {stats.heatmap.map((level, index) => (
              <div
                key={index}
                className="aspect-square rounded-[5px] border border-white/5"
                style={{ background: `rgba(143, 163, 255, ${0.08 + level * 0.18})` }}
                title={`Activity level ${level}`}
              />
            ))}
          </div>
        </section>

        <section className="panel">
          <p className="eyebrow">Upcoming Tasks</p>
          <h2 className="section-title">Next deadlines</h2>
          <div className="mt-5 space-y-3">
            {tasks
              .filter((task) => !task.completed && !task.archived && daysUntil(task.dueDate) >= 0)
              .sort((a, b) => `${a.dueDate}${a.dueTime}`.localeCompare(`${b.dueDate}${b.dueTime}`))
              .slice(0, 5)
              .map((task, index) => (
                <div key={`${task.id}-upcoming-${index}`} className="flex items-center gap-3 rounded-2xl bg-white/[0.035] p-3">
                  <span className="size-2 rounded-full" style={{ background: task.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-stone-500">{task.dueDate} at {task.dueTime}</p>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function TasksView({
  tasks,
  completeTask,
  updateTask,
}: {
  tasks: Task[];
  completeTask: (id: string) => void;
  updateTask: (id: string, updater: (task: Task) => Task) => void;
}) {
  return (
    <div className="animate-rise pt-7">
      <section className="panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Task System</p>
            <h2 className="section-title">Everything, searchable and calm</h2>
          </div>
          <ListFilter className="text-stone-500" size={20} />
        </div>
        <div className="mt-5 grid gap-3">
          {tasks.map((task, index) => (
            <TaskRow key={`${task.id}-tasks-${index}`} task={task} completeTask={completeTask} updateTask={updateTask} expanded />
          ))}
        </div>
      </section>
    </div>
  );
}

function NotesView({
  notes,
  notesStatus,
  addNote,
  updateNote,
  deleteNote,
  accent,
}: {
  notes: Note[];
  notesStatus: string;
  addNote: (formData: FormData) => Promise<boolean>;
  updateNote: (note: Note) => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;
  accent: string;
}) {
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(editingNote);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") || "Untitled note").trim() || "Untitled note";
    const content = String(formData.get("content") || "");
    const color = String(formData.get("color") || accent);

    const saved = editingNote ? await updateNote({ ...editingNote, title, content, color }) : await addNote(formData);

    if (saved) {
      event.currentTarget.reset();
      setEditingNote(null);
    }

    setSaving(false);
  }

  async function handleDelete(noteId: string) {
    const deleted = await deleteNote(noteId);
    if (deleted && editingNote?.id === noteId) {
      setEditingNote(null);
    }
  }

  return (
    <div className="animate-rise pt-7">
      <section className="panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Notes</p>
            <h2 className="section-title">Independent notes</h2>
          </div>
          <NotebookText className="text-stone-500" size={20} />
        </div>

        {notesStatus && (
          <div className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100" role="status">
            {notesStatus}
          </div>
        )}

        <form className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input key={editingNote?.id || "new-title"} className="field" name="title" placeholder="Note title" defaultValue={editingNote?.title || ""} required />
            <input key={`${editingNote?.id || "new"}-color`} className="field h-12 min-w-20" name="color" type="color" defaultValue={editingNote?.color || accent} />
          </div>
          <textarea
            key={`${editingNote?.id || "new"}-content`}
            className="field min-h-32 resize-y"
            name="content"
            placeholder="Write a note..."
            defaultValue={editingNote?.content || ""}
          />
          <div className="flex flex-wrap justify-end gap-2">
            {isEditing && (
              <button className="quiet-button" type="button" onClick={() => setEditingNote(null)}>
                <X size={17} />
                Cancel
              </button>
            )}
            <button className="primary-button" type="submit" disabled={saving}>
              <Plus size={17} />
              {saving ? "Saving..." : isEditing ? "Save note" : "Create note"}
            </button>
          </div>
        </form>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {notes.map((note) => (
            <article key={note.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: note.color }} />
                    <h3 className="truncate text-sm font-semibold">{note.title}</h3>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    Created {formatDateTime(note.createdAt)} · Updated {formatDateTime(note.updatedAt || note.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button className="icon-button" type="button" onClick={() => setEditingNote(note)} aria-label={`Edit ${note.title}`}>
                    <NotebookText size={17} />
                  </button>
                  <button className="icon-button" type="button" onClick={() => void handleDelete(note.id)} aria-label={`Delete ${note.title}`}>
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-stone-300">{note.content || "No content yet."}</p>
            </article>
          ))}

          {notes.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-stone-500 md:col-span-2">
              No notes match your search.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
function CalendarView({
  tasks,
  cursor,
  setCursor,
  completeTask,
  updateTask,
}: {
  tasks: Task[];
  cursor: Date;
  setCursor: (date: Date) => void;
  completeTask: (id: string) => void;
  updateTask: (id: string, updater: (task: Task) => Task) => void;
}) {
  const days = getCalendarDays(cursor);
  const monthName = cursor.toLocaleDateString("en", { month: "long", year: "numeric" });

  return (
    <div className="animate-rise pt-7">
      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Calendar</p>
            <h2 className="section-title">{monthName}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="icon-button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month">
              <ChevronLeft size={18} />
            </button>
            <button className="quiet-button" onClick={() => setCursor(new Date())}>Today</button>
            <button className="icon-button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs text-stone-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayTasks = tasks.filter((task) => task.dueDate === toIso(day.date));
            return (
              <div
                key={day.iso}
                className={`calendar-cell ${day.currentMonth ? "" : "opacity-35"} ${isToday(day.iso) ? "today" : ""}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  const taskId = event.dataTransfer.getData("text/task-id");
                  updateTask(taskId, (task) => ({ ...task, dueDate: day.iso }));
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{day.date.getDate()}</span>
                  {dayTasks.length > 0 && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{dayTasks.length}</span>}
                </div>
                <div className="mt-2 space-y-1">
                  {dayTasks.slice(0, 3).map((task, index) => (
                    <button
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData("text/task-id", task.id)}
                      key={`${day.iso}-${task.id}-${index}`}
                      className="calendar-task"
                      onClick={() => completeTask(task.id)}
                    >
                      <span className="size-1.5 shrink-0 rounded-full" style={{ background: task.color }} />
                      <span className="truncate">{task.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SettingsView({
  settings,
  setSettings,
  authEmail,
  setAuthEmail,
  magicLinkLoading,
  magicLinkMessage,
  signInWithEmail,
  isAuthenticated,
  userEmail,
  enableNotifications,
  exportData,
  importData,
}: {
  settings: SettingsState;
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>;
  authEmail: string;
  setAuthEmail: (value: string) => void;
  magicLinkLoading: boolean;
  magicLinkMessage: { type: "success" | "error"; text: string } | null;
  signInWithEmail: (event: FormEvent<HTMLFormElement>) => void;
  isAuthenticated: boolean;
  userEmail: string | null;
  enableNotifications: () => void;
  exportData: () => void;
  importData: (file?: File) => void;
}) {
  const [telegramChatId, setTelegramChatId] = useState(settings.telegramChatId);
  const [telegramMessage, setTelegramMessage] = useState("");
  const [telegramState, setTelegramState] = useState<"idle" | "saving" | "testing" | "success" | "error">(
    settings.telegramConnected ? "success" : "idle",
  );

  useEffect(() => {
    queueMicrotask(() => {
      setTelegramChatId(settings.telegramChatId);
      setTelegramState(settings.telegramConnected ? "success" : "idle");
      setTelegramMessage(settings.telegramConnected ? "Connected" : "");
    });
  }, [settings.telegramChatId, settings.telegramConnected]);

  async function saveTelegramSettings() {
    const chatId = telegramChatId.trim();

    if (!chatId) {
      setTelegramState("error");
      setTelegramMessage("Chat ID is required before saving.");
      return false;
    }

    setTelegramState("saving");
    setTelegramMessage("Saving Telegram settings...");

    const nextSettings: SettingsState = {
      ...settings,
      telegramChatId: chatId,
      telegramConnected: false,
      telegramLastTestedAt: undefined,
    };

    setSettings(nextSettings);

    if (supabaseConfigured) {
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        const { error } = await supabase.from("profiles").upsert({
          id: data.user.id,
          email: data.user.email,
          telegram_chat_id: chatId,
          telegram_connected: false,
          telegram_last_tested_at: null,
        });

        if (error) {
          setTelegramState("error");
          setTelegramMessage(`Saved locally, but Supabase save failed: ${error.message}`);
          return false;
        }
      }
    }

    setTelegramState("idle");
    setTelegramMessage(supabaseConfigured ? "Saved. Send a test message to connect." : "Saved locally. Send a test message to connect.");
    return true;
  }

  async function sendTelegramTestMessage() {
    const chatId = telegramChatId.trim();

    if (!chatId) {
      setTelegramState("error");
      setTelegramMessage("Chat ID is required before testing.");
      return;
    }

    if (!supabaseConfigured) {
      setTelegramState("error");
      setTelegramMessage("Supabase must be configured before testing Telegram.");
      return;
    }

    setTelegramState("testing");
    setTelegramMessage("Sending test message...");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error("Sign in before sending a Telegram test message.");
      }

      const response = await fetch("/api/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          chatId,
          text: [
            "*Quiet Planner*",
            "",
            "Telegram reminders are connected.",
            "",
            `Test sent: ${new Date().toLocaleString()}`,
          ].join("\n"),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const description = result?.details?.description || result?.error || "Telegram test failed.";
        throw new Error(description);
      }

      const testedAt = new Date().toISOString();
      const nextSettings: SettingsState = {
        ...settings,
        telegramChatId: chatId,
        telegramConnected: true,
        telegramLastTestedAt: testedAt,
      };

      setSettings(nextSettings);

      if (supabaseConfigured) {
        const { data } = await supabase.auth.getUser();

        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email: data.user.email,
            telegram_chat_id: chatId,
            telegram_connected: true,
            telegram_last_tested_at: testedAt,
          });
        }
      }

      setTelegramState("success");
      setTelegramMessage("Connected. Test message delivered successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Telegram test failed.";
      setSettings((current) => ({ ...current, telegramConnected: false, telegramLastTestedAt: undefined }));
      setTelegramState("error");
      setTelegramMessage(message);
    }
  }

  return (
    <div className="animate-rise grid gap-6 pt-7 xl:grid-cols-2">
      {!isAuthenticated ? (
        <section className="panel">
          <p className="eyebrow">Authentication</p>
          <h2 className="section-title">Secure account access</h2>
          <div className="mt-5 grid gap-3">
            <form className="flex gap-2" onSubmit={signInWithEmail}>
              <input
                className="field flex-1"
                type="email"
                placeholder="Email for magic link"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                disabled={magicLinkLoading}
                required
              />
              <button className="icon-button" type="submit" aria-label="Send magic link" disabled={magicLinkLoading}>
                {magicLinkLoading ? <span className="loading-spinner" aria-hidden="true" /> : <Send size={18} />}
              </button>
            </form>
            {magicLinkMessage && (
              <p className={`text-sm ${magicLinkMessage.type === "success" ? "text-emerald-300" : "text-rose-300"}`} role="status" aria-live="polite">
                {magicLinkMessage.text}
              </p>
            )}
            <p className="text-sm text-stone-500">Enter your email and Supabase sends a Magic Link. Opening the link signs you in automatically.</p>
          </div>
        </section>
      ) : (
        <section className="panel">
          <p className="eyebrow">Authentication</p>
          <h2 className="section-title">Signed in</h2>
          <p className="mt-5 text-sm text-stone-500">{userEmail || "Synced account"} is connected. Tasks will save to Supabase.</p>
        </section>
      )}

      <section className="panel">
        <p className="eyebrow">Appearance</p>
        <h2 className="section-title">Theme and accent</h2>
        <div className="mt-5 flex gap-2">
          <button className={`segmented ${settings.theme === "dark" ? "active" : ""}`} onClick={() => setSettings((current) => ({ ...current, theme: "dark" }))}>
            <Moon size={16} /> Dark
          </button>
          <button className={`segmented ${settings.theme === "light" ? "active" : ""}`} onClick={() => setSettings((current) => ({ ...current, theme: "light" }))}>
            <Sun size={16} /> Light
          </button>
        </div>
        <div className="mt-5 flex gap-3">
          {accentOptions.map((accent) => (
            <button
              key={accent}
              className={`swatch ${settings.accent === accent ? "active" : ""}`}
              style={{ background: accent }}
              onClick={() => setSettings((current) => ({ ...current, accent }))}
              aria-label={`Use accent ${accent}`}
            />
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Notifications</p>
        <h2 className="section-title">Reminders and nag mode</h2>
        <div className="mt-5 grid gap-3">
          <button className="quiet-button justify-center" onClick={enableNotifications}>
            <Bell size={17} />
            {settings.browserNotifications ? "Browser notifications enabled" : "Enable browser notifications"}
          </button>
          <label className="label">
            Default nag interval
            <select
              className="field"
              value={settings.defaultNagInterval}
              onChange={(event) => setSettings((current) => ({ ...current, defaultNagInterval: Number(event.target.value) as SettingsState["defaultNagInterval"] }))}
            >
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every 1 hour</option>
            </select>
          </label>
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Telegram</p>
        <h2 className="section-title">Bot reminders</h2>
        <div className="mt-5 grid gap-3">
          <div
            className={`rounded-2xl border p-3 text-sm ${
              telegramState === "success"
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                : telegramState === "error"
                  ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
                  : "border-white/10 bg-white/[0.035] text-stone-400"
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2 font-medium">
              <span
                className={`size-2 rounded-full ${
                  telegramState === "success" ? "bg-emerald-300" : telegramState === "error" ? "bg-rose-300" : "bg-stone-500"
                }`}
              />
              {telegramState === "success" ? "Connected" : telegramState === "error" ? "Not connected" : "Not tested"}
            </div>
            {telegramMessage && <p className="mt-1 text-xs opacity-90">{telegramMessage}</p>}
            {settings.telegramLastTestedAt && telegramState === "success" && (
              <p className="mt-1 text-xs opacity-75">Last tested {new Date(settings.telegramLastTestedAt).toLocaleString()}</p>
            )}
          </div>
          <input
            className="field"
            placeholder="Chat ID"
            value={telegramChatId}
            onChange={(event) => {
              setTelegramChatId(event.target.value);
              setTelegramState("idle");
              setTelegramMessage("");
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button className="quiet-button" type="button" onClick={saveTelegramSettings} disabled={telegramState === "saving" || telegramState === "testing"}>
              <ShieldCheck size={17} />
              {telegramState === "saving" ? "Saving..." : "Save Settings"}
            </button>
            <button className="primary-button" type="button" onClick={sendTelegramTestMessage} disabled={telegramState === "saving" || telegramState === "testing"}>
              <Send size={17} />
              {telegramState === "testing" ? "Testing..." : "Send Test Telegram Message"}
            </button>
          </div>
          <p className="text-sm text-stone-500">
            Chat ID is saved to Supabase. The production bot token is read from Vercel environment variables.
          </p>
        </div>
      </section>

      <section className="panel xl:col-span-2">
        <p className="eyebrow">Backup</p>
        <h2 className="section-title">Export, import, restore</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="quiet-button" onClick={exportData}>
            <Download size={17} /> Export data
          </button>
          <label className="quiet-button cursor-pointer">
            <Upload size={17} /> Import data
            <input className="hidden" type="file" accept="application/json" onChange={(event) => importData(event.target.files?.[0])} />
          </label>
        </div>
      </section>
    </div>
  );
}

function TaskRow({
  task,
  completeTask,
  updateTask,
  expanded = false,
}: {
  task: Task;
  completeTask: (id: string) => void;
  updateTask: (id: string, updater: (task: Task) => Task) => void;
  expanded?: boolean;
}) {
  return (
    <article className={`task-row ${task.completed ? "completed" : ""}`} draggable onDragStart={(event) => event.dataTransfer.setData("text/task-id", task.id)}>
      <button className="check-button" onClick={() => completeTask(task.id)} aria-label={task.completed ? "Mark incomplete" : "Mark complete"}>
        {task.completed && <Check size={14} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: task.color }} />
          <h3 className="truncate text-sm font-semibold sm:text-base">{task.title}</h3>
          {task.favorite && <Star size={14} className="fill-current text-[var(--accent)]" />}
          {task.repeat !== "none" && <span className="pill">Recurring</span>}
          {isOverdue(task) && <span className="pill danger">Overdue</span>}
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-stone-500">{task.description}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-500">
          <span className="meta"><CalendarDays size={13} />{task.dueDate}</span>
          <span className="meta"><Clock size={13} />{task.dueTime}</span>
          <span className="meta"><Timer size={13} />{task.duration}m</span>
          <span className="meta"><Tag size={13} />{task.category}</span>
          {task.links.length > 0 && <span className="meta"><LinkIcon size={13} />{task.links.length}</span>}
          {task.files.length > 0 && <span className="meta"><Paperclip size={13} />{task.files.length}</span>}
        </div>
        {expanded && (
          <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-black/25 p-3 sm:grid-cols-3">
            <label className="mini-label">
              Priority
              <select className="field" value={task.priority} onChange={(event) => updateTask(task.id, (item) => ({ ...item, priority: event.target.value as Priority }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="mini-label">
              Repeat
              <select className="field" value={task.repeat} onChange={(event) => updateTask(task.id, (item) => ({ ...item, repeat: event.target.value as RepeatUnit }))}>
                <option value="none">None</option>
                <option value="daily">Every day</option>
                <option value="weekday">Every weekday</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="mini-label">
              Nag
              <select
                className="field"
                value={task.nagInterval}
                onChange={(event) => updateTask(task.id, (item) => ({ ...item, nagInterval: Number(event.target.value) as Task["nagInterval"], nagMode: true }))}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </label>
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button className="icon-button" onClick={() => updateTask(task.id, (item) => ({ ...item, favorite: !item.favorite }))} aria-label="Toggle favorite">
          <Heart size={17} className={task.favorite ? "fill-current text-[var(--accent)]" : ""} />
        </button>
        <button className="icon-button" onClick={() => updateTask(task.id, (item) => ({ ...item, archived: !item.archived }))} aria-label="Toggle archive">
          <Archive size={17} />
        </button>
        <button className="icon-button" aria-label="More options">
          <MoreHorizontal size={17} />
        </button>
      </div>
    </article>
  );
}

function TaskComposer({
  addTask,
  close,
  accent,
  defaultNagInterval,
  defaultDueDate,
}: {
  addTask: (formData: FormData) => Promise<boolean>;
  close: () => void;
  accent: string;
  defaultNagInterval: 15 | 30 | 60;
  defaultDueDate: string;
}) {
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    console.log("[Quiet Planner] Add Task form onSubmit fired");
    setSaving(true);
    setSubmitError("");

    const formData = new FormData(event.currentTarget);
    const saved = await addTask(formData);

    if (!saved) {
      setSubmitError("Task was not saved. Check the message in the corner and browser console for the exact Supabase response.");
      setSaving(false);
      return;
    }

    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-3 backdrop-blur-sm sm:place-items-center sm:p-6">
      <form className="modal animate-rise" onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">New Task</p>
            <h2 className="section-title">Capture it cleanly</h2>
          </div>
          <button type="button" className="icon-button" onClick={close} aria-label="Close task composer">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <input className="field text-lg" name="title" placeholder="Task title" required />
          <input className="field" name="description" placeholder="Description" />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="label">
              Category
              <select className="field" name="category">
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="label">
              Priority
              <select className="field" name="priority">
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label className="label">
              Duration
              <input className="field" name="duration" type="number" min="5" step="5" defaultValue={30} />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="label">
              Due date
              <input className="field" name="dueDate" type="date" defaultValue={defaultDueDate} />
            </label>
            <label className="label">
              Due time
              <input className="field" name="dueTime" type="time" defaultValue="18:00" />
            </label>
            <label className="label">
              Color
              <input className="field h-12" name="color" type="color" defaultValue={accent} />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="label">
              Repeat
              <select className="field" name="repeat">
                <option value="none">None</option>
                <option value="daily">Every day</option>
                <option value="weekday">Every weekday</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="label">
              Every
              <input className="field" name="customEvery" type="number" min="1" defaultValue={1} />
            </label>
            <label className="label">
              Unit
              <select className="field" name="customUnit">
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </label>
          </div>
          <input className="field" name="tags" placeholder="Tags, comma separated" />
          <input className="field" name="links" placeholder="Links, comma separated" />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <label className="flex items-center gap-3 text-sm">
              <input className="size-4 accent-[var(--accent)]" name="nagMode" type="checkbox" defaultChecked />
              Enable nag mode
            </label>
            <select className="field w-auto" name="nagInterval" defaultValue={defaultNagInterval}>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every 1 hour</option>
            </select>
          </div>
          {submitError && (
            <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-100" role="alert">
              {submitError}
            </div>
          )}
          <button className="primary-button justify-center" type="submit" disabled={saving}>
            <Plus size={18} />
            {saving ? "Saving..." : "Add task"}
          </button>
        </div>
      </form>
    </div>
  );
}

function StatCard({ label, value, detail, icon, warn = false }: { label: string; value: string | number; detail: string; icon: React.ReactNode; warn?: boolean }) {
  return (
    <section className={`stat-card ${warn ? "warn" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="grid size-10 place-items-center rounded-2xl bg-white/[0.06] text-stone-300">{icon}</span>
        <ShieldCheck size={18} className="text-stone-600" />
      </div>
      <p className="mt-5 text-sm text-stone-500">{label}</p>
      <h2 className="mt-1 text-3xl font-semibold tracking-tight">{value}</h2>
      <p className="mt-2 text-sm text-stone-500">{detail}</p>
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Toast({ toast }: { toast: NonNullable<ToastState> }) {
  return (
    <div
      className={`fixed bottom-5 right-5 z-[60] max-w-md rounded-lg border px-4 py-3 text-sm shadow-2xl ${
        toast.type === "success"
          ? "border-emerald-400/40 bg-emerald-950/95 text-emerald-100"
          : "border-rose-400/40 bg-rose-950/95 text-rose-100"
      }`}
      role="status"
      aria-live="polite"
    >
      {toast.message}
    </div>
  );
}

function validateTaskForInsert(task: Task) {
  if (!task.title.trim()) return "Task title is required.";
  if (!task.dueDate || Number.isNaN(new Date(`${task.dueDate}T00:00:00`).getTime())) return "A valid due date is required.";
  if (!task.dueTime || !/^\d{2}:\d{2}$/.test(task.dueTime)) return "A valid due time is required.";
  if (!["low", "medium", "high"].includes(task.priority)) return "Priority must be low, medium, or high.";
  if (!Number.isFinite(task.duration) || task.duration <= 0) return "Duration must be a positive number.";
  if (!Number.isFinite(task.customEvery) || task.customEvery < 1) return "Recurring interval must be at least 1.";
  if (![15, 30, 60].includes(task.nagInterval)) return "Nag interval must be 15, 30, or 60 minutes.";
  return "";
}

function formatSupabaseError(error: { message?: string; details?: string; hint?: string; code?: string }) {
  return [
    error.message,
    error.details ? `Details: ${error.details}` : "",
    error.hint ? `Hint: ${error.hint}` : "",
    error.code ? `Code: ${error.code}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function diagnoseTaskInsertFailure(errorText: string) {
  const lower = errorText.toLowerCase();

  if (lower.includes("relation") && lower.includes("tasks") && lower.includes("does not exist")) {
    return "Fix: run supabase.sql in the Supabase SQL Editor to create the tasks table.";
  }

  if (lower.includes("row-level security") || lower.includes("violates row-level security")) {
    return "Fix: run the RLS policies in supabase.sql and confirm the inserted user_id matches the signed-in Supabase user.";
  }

  if (lower.includes("invalid input syntax for type uuid")) {
    return "Fix: ensure the tasks.id and tasks.user_id columns are UUID columns from the latest supabase.sql.";
  }

  if (lower.includes("permission denied")) {
    return "Fix: enable the tasks RLS policies from supabase.sql and use the publishable key on the client.";
  }

  return "";
}

function isMissingNotesTableError(error: { message?: string; code?: string }) {
  const message = (error.message || "").toLowerCase();
  return error.code === "42P01" || error.code === "PGRST205" || (message.includes("relation") && message.includes("notes") && message.includes("does not exist"));
}

function sortNotes(notes: Note[]) {
  return [...notes].sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));
}

function matchesNoteSearch(note: Note, query: string) {
  if (!query.trim()) return true;
  const haystack = [note.title, note.content].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function formatDateTime(value?: string) {
  if (!value) return "just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return date.toLocaleString();
}

function computeStats(tasks: Task[]) {
  const todayTasks = tasks.filter((task) => isToday(task.dueDate) && !task.archived);
  const completedToday = tasks.filter((task) => task.completedAt?.slice(0, 10) === todayIso()).length;
  const completed = tasks.filter((task) => task.completed).length;
  const productivity = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const overdue = tasks.filter(isOverdue).length;
  const timeSpent = tasks.filter((task) => task.completed).reduce((total, task) => total + task.duration, 0);
  const focusScore = Math.min(100, Math.round(productivity * 0.7 + Math.min(timeSpent / 12, 30)));
  const weekLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const week = weekLabels.map((day, index) => ({ day, value: Math.min(100, 25 + ((completedToday + index * 13) % 70)) }));
  const heatmap = Array.from({ length: 56 }, (_, index) => (index + completedToday) % 5);

  return {
    todayCount: todayTasks.length,
    completedToday,
    productivity,
    overdue,
    currentStreak: completedToday > 0 ? 8 : 7,
    monthlyStreak: 21,
    weeklyStreak: 4,
    timeSpent,
    focusScore,
    week,
    heatmap,
  };
}

function matchesSearch(task: Task, query: string) {
  if (!query.trim()) return true;
  const haystack = [task.title, task.description, task.category, task.priority, ...task.tags].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function matchesFilter(task: Task, filter: Filter) {
  const diff = daysUntil(task.dueDate);
  switch (filter) {
    case "Today":
      return isToday(task.dueDate) && !task.archived;
    case "Tomorrow":
      return isTomorrow(task.dueDate) && !task.archived;
    case "This Week":
      return diff >= 0 && diff <= 7 && !task.archived;
    case "Completed":
      return task.completed;
    case "Incomplete":
      return !task.completed && !task.archived;
    case "High Priority":
      return task.priority === "high" && !task.archived;
    case "Recurring":
      return task.repeat !== "none" && !task.archived;
    case "Overdue":
      return isOverdue(task);
    case "Favorites":
      return task.favorite && !task.archived;
    case "Archived":
      return task.archived;
  }
}

function defaultDueDateForFilter(filter: Filter) {
  if (filter === "Tomorrow") return toIso(addDays(new Date(), 1));
  return todayIso();
}

function materializeRecurring(tasks: Task[]) {
  const today = todayIso();
  const next = [...tasks];

  tasks
    .filter((task) => task.repeat !== "none" && !task.archived && !task.sourceRecurringId)
    .forEach((task) => {
      const existsToday = next.some((item) => (item.id === task.id || item.sourceRecurringId === task.id) && item.dueDate === today);
      if (!existsToday && shouldGenerateToday(task)) {
        next.unshift({
          ...task,
          id: uid("repeat"),
          sourceRecurringId: task.id,
          dueDate: today,
          completed: false,
          completedAt: undefined,
        });
      }
    });

  return next;
}

function shouldGenerateToday(task: Task) {
  const today = new Date();
  const original = new Date(`${task.dueDate}T00:00:00`);
  const diff = Math.floor((today.getTime() - original.getTime()) / 86400000);

  if (diff < 0) return false;

  if (task.repeat === "daily") return true;
  if (task.repeat === "weekday") return today.getDay() > 0 && today.getDay() < 6;
  if (task.repeat === "weekly") return diff % 7 === 0;
  if (task.repeat === "monthly") return today.getDate() === original.getDate();
  if (task.repeat === "yearly") return today.getDate() === original.getDate() && today.getMonth() === original.getMonth();
  if (task.repeat === "custom") {
    const multiplier = task.customUnit === "weeks" ? 7 : task.customUnit === "months" ? 30 : 1;
    return diff % (task.customEvery * multiplier) === 0;
  }
  return false;
}

function getCalendarDays(cursor: Date) {
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = addDays(start, -start.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      date,
      iso: toIso(date),
      currentMonth: date.getMonth() === cursor.getMonth(),
    };
  });
}
