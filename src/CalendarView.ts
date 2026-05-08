import { ItemView, MarkdownRenderer, WorkspaceLeaf, Vault, Notice } from 'obsidian';
import { VIEW_TYPE_CALENDAR, CalendarState, PRIORITY_COLORS, todayStr, Task, ViewMode, ReminderOffset } from './types';
import { TaskManager } from './taskManager';
import { diaryPath } from './scanner';
import { getOverdueTasks, dailyTaskCounts, OverdueTask } from './reminder';
import { getProjects, createProject } from './projectManager';
import { renderGanttChart } from './GanttChart';

export { VIEW_TYPE_CALENDAR };

export class CalendarView extends ItemView {
  private state: CalendarState;
  private taskManager: TaskManager;
  private overdueTasks: OverdueTask[] = [];
  private viewMode: ViewMode;
  private refreshTimer: number | null = null;

  constructor(leaf: WorkspaceLeaf, vault: Vault) {
    super(leaf);
    this.taskManager = new TaskManager(vault);
    const now = new Date();
    this.state = {
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth(),
      selectedDate: todayStr(),
    };
    this.viewMode = 'calendar';
  }

  getViewType(): string {
    return VIEW_TYPE_CALENDAR;
  }

  getDisplayText(): string {
    return 'Memo Calendar';
  }

  getIcon(): string {
    return 'calendar-days';
  }

  async onOpen(): Promise<void> {
    this.registerEvent(this.app.vault.on('create', () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on('modify', () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on('delete', () => this.scheduleRefresh()));
    this.refresh();
  }

  async onClose(): Promise<void> {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      this.refresh();
    }, 250);
  }

  async refresh(): Promise<void> {
    const container = this.contentEl;
    container.empty();

    const vault = (this.app as any).vault as Vault;
    this.overdueTasks = await getOverdueTasks(vault);

    const wrapper = container.createDiv('mc-wrapper');

    this.renderHeader(wrapper);

    if (this.viewMode === 'calendar') {
      const body = wrapper.createDiv('mc-body');
      const leftPanel = body.createDiv('mc-left-panel');
      await this.renderCalendarGrid(leftPanel);
      const rightPanel = body.createDiv('mc-right-panel');
      await this.renderDayDetail(rightPanel);
    } else {
      await this.renderProjectsView(wrapper);
    }

    await this.renderReminderBanner(wrapper);
  }

  private renderHeader(container: HTMLElement): void {
    const header = container.createDiv('mc-header');
    const prev = header.createEl('button', { text: '◀', cls: 'mc-nav-btn' });
    const title = header.createDiv('mc-title');
    this.updateTitle(title);
    const next = header.createEl('button', { text: '▶', cls: 'mc-nav-btn' });

    prev.addEventListener('click', () => {
      if (this.state.currentMonth === 0) {
        this.state.currentMonth = 11;
        this.state.currentYear--;
      } else {
        this.state.currentMonth--;
      }
      this.refresh();
    });

    next.addEventListener('click', () => {
      if (this.state.currentMonth === 11) {
        this.state.currentMonth = 0;
        this.state.currentYear++;
      } else {
        this.state.currentMonth++;
      }
      this.refresh();
    });

    const todayBtn = header.createEl('button', { text: 'Today', cls: 'mc-today-btn' });
    todayBtn.addEventListener('click', () => {
      const now = new Date();
      this.state.currentYear = now.getFullYear();
      this.state.currentMonth = now.getMonth();
      this.state.selectedDate = todayStr();
      this.refresh();
    });

    // View mode toggle
    const toggleContainer = header.createDiv('mc-view-toggle');
    const calBtn = toggleContainer.createEl('button', {
      text: 'Calendar',
      cls: this.viewMode === 'calendar' ? 'mc-toggle-btn mc-toggle-active' : 'mc-toggle-btn',
    });
    const projBtn = toggleContainer.createEl('button', {
      text: 'Projects',
      cls: this.viewMode === 'projects' ? 'mc-toggle-btn mc-toggle-active' : 'mc-toggle-btn',
    });

    calBtn.addEventListener('click', () => {
      this.viewMode = 'calendar';
      this.refresh();
    });
    projBtn.addEventListener('click', () => {
      this.viewMode = 'projects';
      this.refresh();
    });
  }

  private updateTitle(el: HTMLElement): void {
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    el.setText(`${months[this.state.currentMonth]} ${this.state.currentYear}`);
  }

  private async renderCalendarGrid(container: HTMLElement): Promise<void> {
    const grid = container.createDiv('mc-calendar-grid');

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (const name of dayNames) {
      grid.createDiv('mc-day-header').setText(name);
    }

    const year = this.state.currentYear;
    const month = this.state.currentMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const taskCounts = await dailyTaskCounts((this.app as any).vault as Vault, year, month);
    const overdueDates = new Set(
      this.overdueTasks.filter(t => t.date.startsWith(
        `${year}-${String(month + 1).padStart(2, '0')}`
      )).map(t => t.date.slice(8))
    );

    const today = todayStr();

    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < startOffset; i++) {
      const day = prevMonthDays - startOffset + i + 1;
      const cell = grid.createDiv('mc-day-cell mc-day-other');
      cell.createDiv('mc-day-num').setText(String(day));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = dateStr === this.state.selectedDate;
      const isToday = dateStr === today;

      const cell = grid.createDiv('mc-day-cell');
      if (isSelected) cell.addClass('mc-day-selected');
      if (isToday) cell.addClass('mc-day-today');

      const numEl = cell.createDiv('mc-day-num');
      numEl.setText(String(day));

      const count = taskCounts.get(day);
      if (count && count > 0) {
        const dots = cell.createDiv('mc-day-dots');
        for (let j = 0; j < Math.min(count, 3); j++) {
          dots.createDiv('mc-dot');
        }
        if (count > 3) {
          dots.createSpan({ cls: 'mc-dot-more', text: `+${count - 3}` });
        }
      }

      if (overdueDates.has(String(day))) {
        cell.createDiv('mc-overdue-dot');
      }

      cell.addEventListener('click', () => {
        this.state.selectedDate = dateStr;
        this.refresh();
      });

      cell.setAttr('tabindex', '0');
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.state.selectedDate = dateStr;
          this.refresh();
        }
      });
    }

    const totalCells = startOffset + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
      const cell = grid.createDiv('mc-day-cell mc-day-other');
      cell.createDiv('mc-day-num').setText(String(day));
    }
  }

  private async renderDayDetail(container: HTMLElement): Promise<void> {
    const vault = (this.app as any).vault as Vault;
    const date = this.state.selectedDate || todayStr();
    const dayData = await this.taskManager.getDay(date);

    container.empty();

    const dateHeader = container.createDiv('mc-date-header');
    const d = new Date(dayData.date);
    const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    dateHeader.createDiv('mc-date-title').setText(`${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`);
    dateHeader.createDiv('mc-date-weekday').setText(weekdays[d.getDay()]);

    const taskSection = container.createDiv('mc-task-section');
    const taskHeader = taskSection.createDiv('mc-section-header');
    taskHeader.createSpan({ text: 'Tasks', cls: 'mc-section-label' });

    const addBtn = taskHeader.createEl('button', { text: '+', cls: 'mc-add-btn' });
    addBtn.addEventListener('click', () => {
      this.showAddTaskOverlay(taskSection, date);
    });

    const taskList = taskSection.createDiv('mc-task-list');

    if (dayData.tasks.length === 0) {
      taskList.createDiv('mc-empty-state').setText('No tasks for this day. Click + to add.');
    }

    for (const task of dayData.tasks) {
      const taskEl = taskList.createDiv('mc-task-item');
      if (task.done) taskEl.addClass('mc-task-done');

      const checkbox = taskEl.createDiv('mc-checkbox');
      if (task.done) checkbox.addClass('mc-checkbox-checked');
      checkbox.addEventListener('click', async (e) => {
        e.stopPropagation();
        const newDone = !task.done;
        task.done = newDone;
        if (newDone) {
          checkbox.addClass('mc-checkbox-checked');
          taskEl.addClass('mc-task-done');
        } else {
          checkbox.removeClass('mc-checkbox-checked');
          taskEl.removeClass('mc-task-done');
        }
        await this.taskManager.updateTask(date, task.id, { done: newDone });
      });

      const priorityDot = taskEl.createDiv('mc-priority-dot');
      priorityDot.style.backgroundColor = PRIORITY_COLORS[task.priority];

      taskEl.createSpan({ text: task.text, cls: 'mc-task-text' });

      if (task.deadline) {
        taskEl.createSpan({ text: `⏰ ${task.deadline}`, cls: 'mc-task-deadline' });
      }
      if (task.reminder) {
        const reminderLabels: Record<string, string> = { '1day': '🔔1d', '3days': '🔔3d', '1week': '🔔1w' };
        taskEl.createSpan({ text: reminderLabels[task.reminder] || '', cls: 'mc-task-reminder' });
      }
      for (const tag of task.tags) {
        taskEl.createSpan({ text: `#${tag}`, cls: 'mc-task-tag' });
      }

      const deleteBtn = taskEl.createEl('button', { text: '×', cls: 'mc-delete-btn' });
      deleteBtn.addEventListener('click', async () => {
        await this.taskManager.deleteTask(date, task.id);
        this.refresh();
      });
    }

    container.createDiv('mc-divider');

    const bodySection = container.createDiv('mc-body-section');
    const bodyHeader = bodySection.createDiv('mc-section-header');
    bodyHeader.createSpan({ text: 'Work Log', cls: 'mc-section-label' });

    const newProjBtn = bodyHeader.createEl('button', { text: '+Project', cls: 'mc-proj-btn' });
    newProjBtn.addEventListener('click', () => {
      this.showAddProjectOverlay(bodySection, date);
    });

    const openBtn = bodyHeader.createEl('button', { text: 'Edit', cls: 'mc-edit-btn' });
    openBtn.addEventListener('click', () => {
      const path = diaryPath(date);
      const file = vault.getFileByPath(path);
      if (file) {
        (this.app as any).workspace.getLeaf().openFile(file);
      } else {
        (this.app as any).workspace.openLinkText(date, '日记/', true);
      }
    });

    if (dayData.body.trim()) {
      const bodyContent = bodySection.createDiv('mc-body-content');
      await MarkdownRenderer.renderMarkdown(dayData.body, bodyContent, dayData.path, this);
    } else {
      bodySection.createDiv('mc-empty-state').setText('No work log yet. Open this file in Obsidian to write.');
    }
  }

  private async renderProjectsView(container: HTMLElement): Promise<void> {
    const vault = (this.app as any).vault as Vault;
    const projects = await getProjects(vault);

    const body = container.createDiv('mc-projects-body');

    const header = body.createDiv('mc-section-header');
    header.createSpan({ text: 'Active Projects', cls: 'mc-section-label' });

    const addProjBtn = header.createEl('button', { text: '+ New', cls: 'mc-add-btn' });
    addProjBtn.addEventListener('click', () => {
      this.showAddProjectOverlay(body, todayStr());
    });

    if (projects.length === 0) {
      body.createDiv('mc-empty-state').setText(
        'No projects yet. Add #project/xxx tags to your tasks, or click + New.'
      );
      return;
    }

    for (const project of projects) {
      const card = body.createDiv('mc-project-card');
      const cardHeader = card.createDiv('mc-project-header');

      const info = cardHeader.createDiv('mc-project-info');
      const pct = project.totalCount > 0
        ? Math.round((project.doneCount / project.totalCount) * 100)
        : 0;
      info.createSpan({ text: project.name, cls: 'mc-project-name' });
      info.createSpan({ text: `${pct}%`, cls: 'mc-project-pct' });

      const taskWithDeadline = project.tasks.find(t => t.task.deadline);
      const dateText = taskWithDeadline?.task.deadline
        ? `${project.startDate} → ${taskWithDeadline.task.deadline} (deadline)`
        : `${project.startDate} → ${project.endDate}`;
      cardHeader.createSpan({
        text: dateText,
        cls: 'mc-project-dates',
      });

      // Progress bar
      const bar = card.createDiv('mc-progress-bar');
      const fill = bar.createDiv('mc-progress-fill');
      fill.style.width = `${pct}%`;

      if (pct === 100) {
        fill.addClass('mc-progress-done');
      } else if (project.tasks.some(t => t.date < todayStr() && !t.task.done)) {
        fill.addClass('mc-progress-overdue');
      } else {
        fill.addClass('mc-progress-ontrack');
      }

      const details = card.createDiv('mc-project-details');
      details.setText(`${project.doneCount}/${project.totalCount} tasks done`);

      const overdueCount = project.tasks.filter(
        t => t.date < todayStr() && !t.task.done
      ).length;
      if (overdueCount > 0) {
        details.createSpan({ text: ` · ⚠ ${overdueCount} overdue`, cls: 'mc-project-warning' });
      }

      // Expand to show tasks
      card.addEventListener('click', () => {
        const taskList = card.querySelector('.mc-project-tasks');
        if (taskList) {
          (taskList as HTMLElement).style.display =
            (taskList as HTMLElement).style.display === 'none' ? 'block' : 'none';
        }
      });

      const taskList = card.createDiv('mc-project-tasks');
      taskList.style.display = 'none';
      const sortedTasks = [...project.tasks].sort((a, b) => a.date.localeCompare(b.date));
      for (const entry of sortedTasks) {
        const row = taskList.createDiv('mc-project-task-row');
        const dot = row.createDiv('mc-priority-dot');
        dot.style.backgroundColor = entry.task.done ? '#6bcf7f' :
          (entry.date < todayStr() ? '#ff6b6b' : '#ffd93d');
        const sourceBtn = row.createEl('button', { text: entry.date, cls: 'mc-project-task-date mc-link-btn' });
        sourceBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const file = vault.getFileByPath(entry.notePath || diaryPath(entry.date));
          if (file) (this.app as any).workspace.getLeaf().openFile(file);
        });
        row.createSpan({
          text: entry.task.text,
          cls: entry.task.done ? 'mc-task-done' : '',
        });
        if (entry.task.deadline) {
          row.createSpan({
            text: `  ⏰ ${entry.task.deadline}`,
            cls: 'mc-project-deadline',
          });
        }
      }
    }

    // Gantt chart section
    const ganttSection = body.createDiv('mc-gantt-section');
    const ganttHeader = ganttSection.createDiv('mc-section-header');
    ganttHeader.createSpan({ text: 'Gantt Chart', cls: 'mc-section-label' });
    const ganttContainer = ganttSection.createDiv('mc-gantt-container');
    await renderGanttChart(ganttContainer, vault);
  }

  private showAddProjectOverlay(container: HTMLElement, startDate: string): void {
    if (container.querySelector('.mc-add-project-form')) return;

    const form = container.createDiv('mc-add-project-form');

    const title = form.createDiv('mc-form-title');
    title.setText('New Project');

    const nameInput = form.createEl('input', {
      type: 'text',
      placeholder: 'Project name...',
      cls: 'mc-task-input',
    });

    const dateRow = form.createDiv('mc-date-row');
    dateRow.createSpan({ text: 'Start:', cls: 'mc-date-label' });
    const startInput = dateRow.createEl('input', {
      type: 'date',
      cls: 'mc-date-input',
    });
    startInput.value = startDate;

    dateRow.createSpan({ text: 'End:', cls: 'mc-date-label' });
    const endInput = dateRow.createEl('input', {
      type: 'date',
      cls: 'mc-date-input',
    });
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);
    endInput.value = endDate.toISOString().slice(0, 10);

    const hint = form.createDiv('mc-form-hint');
    hint.setText('Creates a project-tagged memo, an initial task, and a Gantt block. Use Ctrl/⌘+Enter to save.');

    const btnRow = form.createDiv('mc-form-btns');
    const submitBtn = btnRow.createEl('button', { text: 'Create project', cls: 'mc-submit-btn' });
    const cancelBtn = btnRow.createEl('button', { text: 'Cancel', cls: 'mc-cancel-btn' });

    const submit = async (): Promise<void> => {
      if (!nameInput.value.trim() || !startInput.value || !endInput.value || submitBtn.disabled) return;

      submitBtn.disabled = true;
      submitBtn.setText('Creating…');
      try {
        const vault = (this.app as any).vault as Vault;
        await createProject(vault, nameInput.value.trim(), startInput.value, endInput.value);
        form.remove();
        await this.refresh();
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.setText('Create project');
        new Notice(`Failed to create project: ${err}`);
      }
    };

    submitBtn.addEventListener('click', submit);
    cancelBtn.addEventListener('click', () => form.remove());
    form.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        submit();
      }
    });

    nameInput.focus();
  }

  private showAddTaskOverlay(container: HTMLElement, date: string): void {
    if (container.querySelector('.mc-add-task-form')) return;

    const form = container.createDiv('mc-add-task-form');
    const inputRow = form.createDiv('mc-task-input-row');
    const input = inputRow.createEl('input', {
      type: 'text',
      placeholder: 'Task description...',
      cls: 'mc-task-input',
    });
    const prioritySelect = inputRow.createEl('select', { cls: 'mc-priority-select' });
    prioritySelect.innerHTML = `
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="low">Low</option>
    `;

    const metaRow = form.createDiv('mc-deadline-row');
    metaRow.createSpan({ text: 'Deadline:', cls: 'mc-date-label' });
    const deadlineInput = metaRow.createEl('input', {
      type: 'date',
      cls: 'mc-date-input',
    });
    metaRow.createSpan({ text: 'Remind:', cls: 'mc-date-label' });
    const reminderSelect = metaRow.createEl('select', { cls: 'mc-priority-select' });
    reminderSelect.innerHTML = `
      <option value="">No reminder</option>
      <option value="1day">1 day before</option>
      <option value="3days">3 days before</option>
      <option value="1week">1 week before</option>
    `;

    const tagRow = form.createDiv('mc-tag-row');
    tagRow.createSpan({ text: 'Tags:', cls: 'mc-date-label' });
    const tagInput = tagRow.createEl('input', {
      type: 'text',
      placeholder: 'project/app, writing, #context',
      cls: 'mc-task-input mc-tag-input',
    });

    const btnRow = form.createDiv('mc-form-btns');
    const submitBtn = btnRow.createEl('button', { text: 'Add task', cls: 'mc-submit-btn' });
    const cancelBtn = btnRow.createEl('button', { text: 'Cancel', cls: 'mc-cancel-btn' });

    const submit = async (): Promise<void> => {
      const text = input.value.trim();
      if (!text || submitBtn.disabled) return;

      submitBtn.disabled = true;
      submitBtn.setText('Adding…');
      try {
        const deadline = deadlineInput.value || undefined;
        const reminder = (reminderSelect.value || undefined) as ReminderOffset | undefined;
        await this.taskManager.addTask(
          date,
          text,
          prioritySelect.value as Task['priority'],
          deadline,
          reminder,
          this.parseTagInput(tagInput.value)
        );
        form.remove();
        await this.refresh();
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.setText('Add task');
        new Notice(`Failed to add task: ${err}`);
      }
    };

    submitBtn.addEventListener('click', submit);
    cancelBtn.addEventListener('click', () => form.remove());

    form.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        submit();
      }
    });

    input.focus();
  }

  private parseTagInput(value: string): string[] {
    return [...new Set(value
      .split(/[ ,]+/)
      .map(tag => tag.replace(/^#/, '').trim())
      .filter(Boolean))];
  }

  private async renderReminderBanner(container: HTMLElement): Promise<void> {
    if (this.overdueTasks.length === 0) return;

    const banner = container.createDiv('mc-reminder-banner');
    const overdue = this.overdueTasks.filter(t => t.date < todayStr());
    const today = this.overdueTasks.filter(t => t.date === todayStr());

    if (overdue.length > 0) {
      const overdueEl = banner.createDiv('mc-reminder-overdue');
      overdueEl.createSpan({ text: `⚠ Overdue: ${overdue.length} task(s)` });

      for (const item of overdue.slice(0, 3)) {
        overdueEl.createDiv('mc-reminder-item').setText(
          `${item.date}: ${item.task.text}`
        );
      }
    }

    if (today.length > 0) {
      const todayEl = banner.createDiv('mc-reminder-today');
      todayEl.createSpan({ text: `\u{1F4CC} Today: ${today.length} task(s)` });
    }
  }
}
