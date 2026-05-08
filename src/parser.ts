import { Task } from './types';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

export function parseFrontmatter(content: string): { tasks: Task[]; body: string } | null {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return null;
  }

  const yamlBlock = match[1];
  const body = match[2] || '';

  const tasks: Task[] = [];
  const lines = yamlBlock.split('\n');

  let inTasks = false;
  let currentTask: Partial<Task> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'tasks:') {
      inTasks = true;
      continue;
    }

    if (inTasks && trimmed.startsWith('-')) {
      if (currentTask && currentTask.id && currentTask.text !== undefined) {
        tasks.push(normalizeTask(currentTask));
      }
      currentTask = {};
      const inline = trimmed.replace(/^-\s*/, '');
      parseTaskInline(inline, currentTask);
      continue;
    }

    if (inTasks && currentTask && trimmed !== '') {
      parseTaskProperty(trimmed, currentTask);
    }

    if (inTasks && trimmed === '' && currentTask) {
      continue;
    }

    if (inTasks && !trimmed.startsWith('-') && !trimmed.startsWith('  ') && !trimmed.startsWith('\t')) {
      if (currentTask && currentTask.id && currentTask.text !== undefined) {
        tasks.push(normalizeTask(currentTask));
      }
      currentTask = null;
      inTasks = false;
    }
  }

  if (currentTask && currentTask.id && currentTask.text !== undefined) {
    tasks.push(normalizeTask(currentTask));
  }

  return { tasks, body };
}


function normalizeTask(task: Partial<Task>): Task {
  const normalized: Task = {
    id: task.id ?? '',
    text: task.text ?? '',
    done: task.done ?? false,
    priority: task.priority ?? 'medium',
    tags: task.tags ?? [],
  };
  if (task.deadline) normalized.deadline = task.deadline;
  if (task.reminder) normalized.reminder = task.reminder;
  return normalized;
}

function parseTaskInline(line: string, task: Partial<Task>): void {
  const parts = splitByComma(line);
  for (const part of parts) {
    parseTaskProperty(part.trim(), task);
  }
}

function splitByComma(str: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let inBrackets = 0;

  for (const ch of str) {
    if (ch === '"') inQuotes = !inQuotes;
    if (ch === '[' && !inQuotes) inBrackets++;
    if (ch === ']' && !inQuotes) inBrackets--;
    if (ch === ',' && !inQuotes && inBrackets === 0) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) result.push(current);
  return result;
}

function parseTaskProperty(trimmed: string, task: Partial<Task>): void {
  const colonIdx = trimmed.indexOf(':');
  if (colonIdx === -1) return;

  const key = trimmed.slice(0, colonIdx).trim();
  let value = trimmed.slice(colonIdx + 1).trim();

  value = value.replace(/^"(.*)"$/, '$1');
  value = value.replace(/\\"/g, '"');

  switch (key) {
    case 'id':
      task.id = value;
      break;
    case 'text':
      task.text = value;
      break;
    case 'done':
      task.done = value === 'true';
      break;
    case 'priority':
      task.priority = (value === 'high' || value === 'low') ? value : 'medium';
      break;
    case 'deadline':
      task.deadline = value;
      break;
    case 'reminder':
      if (value === '1day' || value === '3days' || value === '1week') {
        task.reminder = value;
      }
      break;
    case 'tags':
      const arrMatch = value.match(/^\[(.*)\]$/);
      if (arrMatch) {
        task.tags = arrMatch[1].split(',').map(t => t.trim().replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"')).filter(Boolean);
      }
      break;
  }
}

export function serializeFrontmatter(tasks: Task[], body: string): string {
  const yamlTasks = tasks.map(t => {
    const tags = `[${t.tags.map(x => `"${x.replace(/"/g, '\\"')}"`).join(', ')}]`;
    const deadlineLine = t.deadline ? `\n    deadline: "${t.deadline}"` : '';
    const reminderLine = t.reminder ? `\n    reminder: ${t.reminder}` : '';
    return `  - id: "${t.id}"\n    text: "${t.text.replace(/"/g, '\\"')}"\n    done: ${t.done}\n    priority: ${t.priority}\n    tags: ${tags}${deadlineLine}${reminderLine}`;
  }).join('\n');

  const yamlBlock = tasks.length > 0
    ? `tasks:\n${yamlTasks}`
    : '';

  return yamlBlock
    ? `---\n${yamlBlock}\n---\n${body}`
    : `---\n---\n${body}`;
}

export function ensureFrontmatter(content: string): string {
  if (FRONTMATTER_RE.test(content)) return content;
  return `---\n---\n${content}`;
}
