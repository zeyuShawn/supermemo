import { Vault } from 'obsidian';
import { Task, DayData, generateId } from './types';
import { diaryPath } from './scanner';
import { parseFrontmatter, serializeFrontmatter, ensureFrontmatter } from './parser';

export class TaskManager {
  constructor(private vault: Vault) {}

  async getDay(date: string): Promise<DayData> {
    const path = diaryPath(date);
    const file = this.vault.getFileByPath(path);

    if (!file) {
      return { date, path, tasks: [], body: '' };
    }

    const content = await this.vault.cachedRead(file);
    const parsed = parseFrontmatter(content);

    return {
      date,
      path,
      tasks: parsed?.tasks ?? [],
      body: parsed?.body ?? content,
    };
  }

  async addTask(date: string, text: string, priority: Task['priority'] = 'medium', deadline?: string, reminder?: Task['reminder']): Promise<Task> {
    const task: Task = {
      id: generateId(),
      text,
      done: false,
      priority,
      tags: [],
    };
    if (deadline) task.deadline = deadline;
    if (reminder) task.reminder = reminder;

    const path = diaryPath(date);
    const file = this.vault.getFileByPath(path);

    if (!file) {
      const content = serializeFrontmatter([task], '');
      await this.vault.create(path, content);
      return task;
    }

    await this.vault.process(file, (content) => {
      const withFm = ensureFrontmatter(content);
      const parsed = parseFrontmatter(withFm);
      const tasks = parsed?.tasks ?? [];
      tasks.push(task);
      return serializeFrontmatter(tasks, parsed?.body ?? '');
    });

    return task;
  }

  async updateTask(date: string, taskId: string, updates: Partial<Task>): Promise<void> {
    const path = diaryPath(date);
    const file = this.vault.getFileByPath(path);
    if (!file) return;

    await this.vault.process(file, (content) => {
      const withFm = ensureFrontmatter(content);
      const parsed = parseFrontmatter(withFm);
      if (!parsed) return content;

      const tasks = parsed.tasks.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      );
      return serializeFrontmatter(tasks, parsed.body);
    });
  }

  async deleteTask(date: string, taskId: string): Promise<void> {
    const path = diaryPath(date);
    const file = this.vault.getFileByPath(path);
    if (!file) return;

    await this.vault.process(file, (content) => {
      const withFm = ensureFrontmatter(content);
      const parsed = parseFrontmatter(withFm);
      if (!parsed) return content;

      const tasks = parsed.tasks.filter(t => t.id !== taskId);
      return serializeFrontmatter(tasks, parsed.body);
    });
  }

  async appendBody(date: string, text: string): Promise<void> {
    const path = diaryPath(date);
    const file = this.vault.getFileByPath(path);

    if (!file) {
      const content = `---\n---\n${text}\n`;
      await this.vault.create(path, content);
      return;
    }

    await this.vault.process(file, (content) => {
      const withFm = ensureFrontmatter(content);
      const parsed = parseFrontmatter(withFm);
      if (!parsed) return content;
      const newBody = parsed.body + '\n' + text;
      return serializeFrontmatter(parsed.tasks, newBody);
    });
  }
}
