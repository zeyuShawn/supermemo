import { Vault, TFile } from 'obsidian';
import { Task, todayStr, ReminderOffset } from './types';
import { scanDiaryFiles } from './scanner';
import { parseFrontmatter } from './parser';

export interface OverdueTask {
  date: string;
  task: Task;
  path: string;
}

/** Map reminder offset to days */
const REMINDER_DAYS: Record<ReminderOffset, number> = {
  '1day': 1,
  '3days': 3,
  '1week': 7,
};

/**
 * Scan all diary files, collect incomplete tasks from dates <= today.
 */
export async function getOverdueTasks(vault: Vault): Promise<OverdueTask[]> {
  const files = scanDiaryFiles(vault);
  const today = todayStr();
  const result: OverdueTask[] = [];

  for (const file of files) {
    const date = file.name.replace(/\.md$/, '');
    if (date > today) continue;

    const content = await vault.read(file);
    const parsed = parseFrontmatter(content);
    if (!parsed) continue;

    for (const task of parsed.tasks) {
      if (!task.done) {
        result.push({ date, task, path: file.path });
      }
    }
  }

  return result;
}

/**
 * Get task counts per day for calendar dot indicators.
 */
export async function dailyTaskCounts(
  vault: Vault,
  year: number,
  month: number
): Promise<Map<number, number>> {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const files = scanDiaryFiles(vault).filter(f => f.name.startsWith(prefix));
  const map = new Map<number, number>();

  for (const file of files) {
    const day = parseInt(file.name.slice(8, 10), 10);
    if (isNaN(day)) continue;
    const content = await vault.read(file);
    const taskCount = (content.match(/\n\s+-\s+id:/g) || []).length;
    if (taskCount > 0) {
      map.set(day, (map.get(day) || 0) + taskCount);
    }
  }

  return map;
}

/** Data for a reminder that should fire */
export interface ReminderAlert {
  task: Task;
  date: string;
  path: string;
  offset: ReminderOffset;
  daysUntil: number;
}

/** Set of already-fired reminder keys: "taskId:reminderOffset" */
const firedReminders = new Set<string>();

/**
 * Check all tasks for due reminders. Returns tasks whose reminder threshold
 * has been reached. Each reminder fires only once per plugin session.
 */
export async function checkReminders(vault: Vault): Promise<ReminderAlert[]> {
  const files = scanDiaryFiles(vault);
  const today = todayStr();
  const todayDate = new Date(today);
  const alerts: ReminderAlert[] = [];

  for (const file of files) {
    const content = await vault.read(file);
    const parsed = parseFrontmatter(content);
    if (!parsed) continue;

    for (const task of parsed.tasks) {
      if (task.done) continue;
      if (!task.deadline || !task.reminder) continue;

      const reminderKey = `${task.id}:${task.reminder}`;
      if (firedReminders.has(reminderKey)) continue;

      const deadlineDate = new Date(task.deadline);
      const daysUntil = Math.floor(
        (deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const threshold = REMINDER_DAYS[task.reminder];
      if (daysUntil <= threshold && daysUntil >= 0) {
        alerts.push({
          task,
          date: file.name.replace(/\.md$/, ''),
          path: file.path,
          offset: task.reminder,
          daysUntil,
        });
        firedReminders.add(reminderKey);
      }
    }
  }

  return alerts;
}

/**
 * Fire a system notification for a reminder.
 * Uses the Electron Notification API available in Obsidian desktop.
 */
export function fireReminderNotification(alert: ReminderAlert): void {
  try {
    const when = alert.daysUntil === 0
      ? 'today'
      : alert.daysUntil === 1
        ? 'tomorrow'
        : `in ${alert.daysUntil} days`;

    const title = `⏰ Task Reminder`;
    const body = `"${alert.task.text}" is due ${when} (${alert.task.deadline})`;

    const n = new Notification(title, {
      body,
      silent: false,
    });

    n.addEventListener('click', () => {
      // Opening the file would require app reference — skip for now
      n.close();
    });
  } catch (_e) {
    // Notification API not available — silently ignore
  }
}

/**
 * Request notification permission if not granted.
 */
export function requestNotificationPermission(): void {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

/**
 * Reset fired reminders (e.g., when plugin reloads).
 */
export function resetReminders(): void {
  firedReminders.clear();
}
