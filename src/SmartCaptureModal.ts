import { App, Modal, Notice, Vault } from 'obsidian';
import { TaskManager } from './taskManager';
import { formatSmartMemoPreview, parseSmartMemo, SmartMemoParseResult } from './SmartMemoParser';

interface SmartCaptureOptions {
  initialText?: string;
  vault: Vault;
  onSaved?: () => void | Promise<void>;
}

export class SmartCaptureModal extends Modal {
  private taskManager: TaskManager;
  private inputEl!: HTMLTextAreaElement;
  private previewEl!: HTMLElement;
  private saveBtn!: HTMLButtonElement;
  private parsed!: SmartMemoParseResult;

  constructor(app: App, private options: SmartCaptureOptions) {
    super(app);
    this.taskManager = new TaskManager(options.vault);
  }

  onOpen(): void {
    const { contentEl, titleEl } = this;
    titleEl.setText('Smart Capture');
    contentEl.empty();
    contentEl.addClass('mc-smart-modal');

    contentEl.createEl('p', {
      text: 'Write naturally. Supermemo will extract date, time, title, and location for you.',
      cls: 'mc-smart-help',
    });

    this.inputEl = contentEl.createEl('textarea', {
      cls: 'mc-smart-input',
      attr: {
        placeholder: '例如：下周二14:00打球，丘德拔体育馆\nExample: next Tuesday 2pm play basketball @ Jude Sports Center',
      },
    });
    this.inputEl.value = this.options.initialText ?? '';

    this.previewEl = contentEl.createDiv('mc-smart-preview');

    const examples = contentEl.createDiv('mc-smart-examples');
    examples.createSpan({ text: 'Try: ', cls: 'mc-smart-examples-label' });
    for (const example of ['明天下午3点组会，A301', 'next Friday 10am submit report @ office', '2026-06-01 09:30 论文开题']) {
      const chip = examples.createEl('button', { text: example, cls: 'mc-smart-example-chip' });
      chip.addEventListener('click', () => {
        this.inputEl.value = example;
        this.updatePreview();
        this.inputEl.focus();
      });
    }

    const actions = contentEl.createDiv('mc-smart-actions');
    const cancelBtn = actions.createEl('button', { text: 'Cancel', cls: 'mc-cancel-btn' });
    this.saveBtn = actions.createEl('button', { text: 'Save memo', cls: 'mc-submit-btn' });

    cancelBtn.addEventListener('click', () => this.close());
    this.saveBtn.addEventListener('click', () => this.save());
    this.inputEl.addEventListener('input', () => this.updatePreview());
    this.inputEl.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        this.save();
      }
    });

    this.updatePreview();
    this.inputEl.focus();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private updatePreview(): void {
    const text = this.inputEl.value.trim();
    this.previewEl.empty();

    if (!text) {
      this.previewEl.createDiv('mc-empty-state').setText('Your parsed memo preview will appear here.');
      this.saveBtn.disabled = true;
      return;
    }

    this.parsed = parseSmartMemo(text);
    this.saveBtn.disabled = this.parsed.title.trim().length === 0;

    const summary = this.previewEl.createDiv('mc-smart-summary');
    summary.createSpan({ text: formatSmartMemoPreview(this.parsed), cls: 'mc-smart-summary-text' });
    summary.createSpan({ text: this.parsed.confidence, cls: `mc-smart-confidence mc-smart-confidence-${this.parsed.confidence}` });

    const grid = this.previewEl.createDiv('mc-smart-fields');
    this.renderField(grid, 'Date', this.parsed.date);
    this.renderField(grid, 'Time', this.parsed.time ?? '—');
    this.renderField(grid, 'Event', this.parsed.title);
    this.renderField(grid, 'Place', this.parsed.location ?? '—');
  }

  private renderField(container: HTMLElement, label: string, value: string): void {
    const field = container.createDiv('mc-smart-field');
    field.createSpan({ text: label, cls: 'mc-smart-field-label' });
    field.createSpan({ text: value, cls: 'mc-smart-field-value' });
  }

  private async save(): Promise<void> {
    const text = this.inputEl.value.trim();
    if (!text || this.saveBtn.disabled) return;

    this.saveBtn.disabled = true;
    this.saveBtn.setText('Saving…');

    try {
      const parsed = parseSmartMemo(text);
      await this.taskManager.addTask(
        parsed.date,
        parsed.title,
        'medium',
        parsed.date,
        undefined,
        [],
        parsed.time,
        parsed.location,
        parsed.source
      );
      await this.options.onSaved?.();
      new Notice(`Saved memo: ${formatSmartMemoPreview(parsed)}`);
      this.close();
    } catch (err) {
      this.saveBtn.disabled = false;
      this.saveBtn.setText('Save memo');
      new Notice(`Failed to save memo: ${err}`);
    }
  }
}
