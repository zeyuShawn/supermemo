import { Plugin, WorkspaceLeaf } from 'obsidian';
import { CalendarView, VIEW_TYPE_CALENDAR } from './CalendarView';
import { ensureDiaryFolder } from './scanner';
import { renderGanttChart, parseGanttBlock } from './GanttChart';
import { checkReminders, fireReminderNotification, requestNotificationPermission, resetReminders } from './reminder';

const REMINDER_INTERVAL_MS = 5 * 60 * 1000; // check every 5 minutes

export default class MemoCalendarPlugin extends Plugin {
  private reminderInterval: number | null = null;

  async onload(): Promise<void> {
    await ensureDiaryFolder(this.app.vault);

    this.registerView(
      VIEW_TYPE_CALENDAR,
      (leaf: WorkspaceLeaf) => new CalendarView(leaf, this.app.vault)
    );

    this.addRibbonIcon('calendar-days', 'Open Memo Calendar', () => {
      this.activateView();
    });

    this.addCommand({
      id: 'open-memo-calendar',
      name: 'Open Memo Calendar',
      callback: () => this.activateView(),
    });

    // Register code block processor for memo-gantt
    this.registerMarkdownCodeBlockProcessor('memo-gantt', async (source, el) => {
      const params = parseGanttBlock(source);
      await renderGanttChart(el, this.app.vault, params.project);
    });

    // Request system notification permission
    requestNotificationPermission();

    // Start reminder checker
    this.startReminderCheck();
  }

  async onunload(): Promise<void> {
    this.stopReminderCheck();
    resetReminders();
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CALENDAR);
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;

    const existing = workspace.getLeavesOfType(VIEW_TYPE_CALENDAR);
    if (existing.length > 0) {
      workspace.revealLeaf(existing[0]);
      return;
    }

    const leaf = workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE_CALENDAR, active: true });
    workspace.revealLeaf(leaf);
  }

  private startReminderCheck(): void {
    // Run immediately on startup
    this.runReminderCheck();
    // Then poll at interval
    this.reminderInterval = window.setInterval(() => {
      this.runReminderCheck();
    }, REMINDER_INTERVAL_MS);
    this.registerInterval(this.reminderInterval);
  }

  private async runReminderCheck(): Promise<void> {
    try {
      const alerts = await checkReminders(this.app.vault);
      for (const alert of alerts) {
        fireReminderNotification(alert);
      }
    } catch (_e) {
      // Silently ignore reminder check failures
    }
  }

  private stopReminderCheck(): void {
    if (this.reminderInterval !== null) {
      window.clearInterval(this.reminderInterval);
      this.reminderInterval = null;
    }
  }
}
