import { Editor, MarkdownPostProcessorContext, Plugin, WorkspaceLeaf } from 'obsidian';
import { CalendarView, VIEW_TYPE_CALENDAR } from './CalendarView';
import { ensureDiaryFolder } from './scanner';
import { renderGanttChart, parseGanttBlock } from './GanttChart';
import { checkReminders, fireReminderNotification, requestNotificationPermission, resetReminders } from './reminder';
import { extractBodyTags, isProjectTag } from './projectManager';
import { SmartCaptureModal } from './SmartCaptureModal';

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

    this.addCommand({
      id: 'smart-capture-memo',
      name: 'Smart Capture Memo',
      callback: () => this.openSmartCapture(),
    });

    this.addCommand({
      id: 'smart-capture-selection',
      name: 'Smart Capture Memo from selection or current line',
      editorCallback: (editor: Editor) => {
        const selected = editor.getSelection().trim();
        const currentLine = editor.getLine(editor.getCursor().line).trim();
        this.openSmartCapture(selected || currentLine, async () => {
          await this.activateView();
        });
      },
    });

    // Register code block processor for memo-gantt
    this.registerMarkdownCodeBlockProcessor('memo-gantt', async (source, el) => {
      const params = parseGanttBlock(source);
      await renderGanttChart(el, this.app.vault, params.project);
    });

    // Automatically show a project timeline module inside notes tagged with
    // `project` or `project/<name>`, so notes and memos stay connected.
    this.registerMarkdownPostProcessor(async (el, ctx) => {
      await this.renderTaggedProjectGantt(el, ctx);
    }, 100);

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



  private openSmartCapture(initialText = '', onSaved?: () => void | Promise<void>): void {
    new SmartCaptureModal(this.app, {
      initialText,
      vault: this.app.vault,
      onSaved: async () => {
        await onSaved?.();
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)) {
          const view = leaf.view;
          if (view instanceof CalendarView) await view.refresh();
        }
      },
    }).open();
  }

  private async renderTaggedProjectGantt(
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ): Promise<void> {
    const file = this.app.vault.getFileByPath(ctx.sourcePath);
    if (!file || !file.extension || file.extension !== 'md') return;

    const section = ctx.getSectionInfo(el);
    if (section && section.lineStart > 0) return;

    const frontmatterTags = this.normalizeTags(ctx.frontmatter?.tags ?? ctx.frontmatter?.tag);
    const bodyTags = extractBodyTags(await this.app.vault.read(file));
    const projectTags = [...new Set([...frontmatterTags, ...bodyTags].filter(isProjectTag))];
    if (projectTags.length === 0) return;

    // Avoid duplicating the auto module when the note already contains an
    // explicit memo-gantt code block.
    if (el.querySelector('.block-language-memo-gantt, .mc-note-gantt-module')) return;

    const projectFilter = projectTags.find(tag => tag.startsWith('project/'))?.replace('project/', '');
    const module = el.createDiv('mc-note-gantt-module');
    const header = module.createDiv('mc-note-gantt-header');
    header.createSpan({ text: projectFilter ? `Project timeline · ${projectFilter}` : 'Project timeline', cls: 'mc-section-label' });
    const chart = module.createDiv('mc-gantt-container');
    await renderGanttChart(chart, this.app.vault, projectFilter);
  }

  private normalizeTags(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map(String).map(tag => tag.replace(/^#/, '').trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(/[ ,]+/)
        .map(tag => tag.replace(/^#/, '').trim())
        .filter(Boolean);
    }
    return [];
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
