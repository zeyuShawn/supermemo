import { Vault, TFile } from 'obsidian';
import { Task, Project, todayStr } from './types';
import { scanDiaryFiles } from './scanner';
import { parseFrontmatter, serializeFrontmatter, ensureFrontmatter } from './parser';

/**
 * Extract note-level tags from YAML frontmatter.
 * Handles: `tags: foo`, `tags: [a, b]`, `tags:\n  - a\n  - b`, `tag: foo`
 */
export function extractNoteTags(yamlBlock: string): string[] {
  const tags: string[] = [];

  // Try inline array: tags: [a, b, c]
  const inlineArray = yamlBlock.match(/^tags:\s*\[([^\]]+)\]/m);
  if (inlineArray) {
    for (const part of inlineArray[1].split(',')) {
      const cleaned = part.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
      if (cleaned) tags.push(cleaned);
    }
    return tags;
  }

  // Try single line: tags: foo
  const singleLine = yamlBlock.match(/^tags:\s*"?([^"\n\[\]]+)"?\s*$/m);
  if (singleLine) {
    const val = singleLine[1].trim();
    if (val && !val.startsWith('-')) {
      tags.push(val);
      return tags;
    }
  }

  // Try multi-line list: tags:\n  - a\n  - b
  const tagsSection = yamlBlock.match(/^tags:\s*\n([\s\S]*?)(?=\n\S|$)/m);
  if (tagsSection) {
    const tagLines = tagsSection[1].matchAll(/^\s*-\s*"?([^"\n]+)"?\s*$/gm);
    for (const m of tagLines) {
      tags.push(m[1].trim());
    }
  }

  // Also check `tag: xxx` (singular)
  const tagMatch = yamlBlock.match(/^tag:\s*"?([^"\n]+)"?\s*$/m);
  if (tagMatch) {
    tags.push(tagMatch[1].trim());
  }

  return tags;
}

/**
 * Extract inline tags from note body.
 * Matches #project, #project/foo, #tag/subtag etc.
 */
export function extractBodyTags(body: string): string[] {
  const tags: string[] = [];
  const re = /#([\w-]+(?:\/[\w-]+)*)/g;
  let match;
  while ((match = re.exec(body)) !== null) {
    tags.push(match[1]);
  }
  return tags;
}

export function isProjectTag(tag: string): boolean {
  return tag === 'project' || tag.startsWith('project/');
}

interface TaskEntry {
  date: string;
  task: Task;
  notePath: string;
}

export async function getProjects(vault: Vault): Promise<Project[]> {
  const diaryFiles = scanDiaryFiles(vault);
  const diaryPaths = new Set(diaryFiles.map(f => f.path));
  const projectMap = new Map<string, TaskEntry[]>();

  // Get all markdown files, process diary files first
  const allFiles = vault.getMarkdownFiles();

  async function processFile(file: TFile, isDiary: boolean): Promise<void> {
    const content = await vault.read(file);
    const parsed = parseFrontmatter(content);
    if (!parsed) return;

    const noteDate = isDiary ? file.name.replace(/\.md$/, '') : undefined;
    const noteProjectTags = new Set<string>();

    // From note-level frontmatter tags
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (fmMatch) {
      for (const tag of extractNoteTags(fmMatch[1])) {
        if (isProjectTag(tag)) noteProjectTags.add(tag);
      }
    }

    // From body inline tags
    for (const tag of extractBodyTags(parsed.body)) {
      if (isProjectTag(tag)) noteProjectTags.add(tag);
    }

    // Associate each task to its own project tags first. Note-level
    // project tags are a fallback so a project note can group untagged tasks
    // without incorrectly copying explicitly project-tagged tasks elsewhere.
    for (const task of parsed.tasks) {
      const taskProjectTags = task.tags.filter(isProjectTag);
      const tagsForTask = taskProjectTags.length > 0 ? taskProjectTags : [...noteProjectTags];

      for (const projectTag of tagsForTask) {
        const name = projectTag.replace('project/', '');
        if (!projectMap.has(name)) projectMap.set(name, []);

        const existing = projectMap.get(name)!;
        if (!existing.some(e => e.task.id === task.id && e.notePath === file.path)) {
          existing.push({ date: noteDate ?? task.deadline ?? todayStr(), task, notePath: file.path });
        }
      }
    }
  }

  // Process diary files
  for (const file of diaryFiles) {
    await processFile(file, true);
  }

  // Process non-diary files that might have project tags
  for (const file of allFiles) {
    if (!diaryPaths.has(file.path)) {
      await processFile(file, false);
    }
  }

  const projects: Project[] = [];
  for (const [name, entries] of projectMap) {
    if (entries.length === 0) continue;
    const dates = entries.map(e => e.date).filter(Boolean).sort();
    const doneCount = entries.filter(e => e.task.done).length;
    const taskWithDeadline = entries.find(e => e.task.deadline);

    projects.push({
      name,
      tag: `project/${name}`,
      tasks: entries,
      startDate: dates[0] || todayStr(),
      endDate: taskWithDeadline?.task.deadline || dates[dates.length - 1] || todayStr(),
      doneCount,
      totalCount: entries.length,
    });
  }

  projects.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return projects;
}

function addTagToFrontmatter(content: string, tag: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return content;

  let yaml = match[1];
  if (yaml.includes(tag)) return content;
  const body = match[2] ?? '';
  const quotedTag = `"${tag.replace(/"/g, '\\"')}"`;

  if (/^tags:\s*\n/m.test(yaml)) {
    yaml = yaml.replace(/^tags:\s*\n/m, `tags:\n  - ${quotedTag}\n`);
  } else if (/^tags:\s*\[([^\]]*)\]\s*$/m.test(yaml)) {
    yaml = yaml.replace(/^tags:\s*\[([^\]]*)\]\s*$/m, (_line, tags) => {
      const prefix = String(tags).trim();
      return `tags: [${prefix ? `${prefix}, ` : ''}${quotedTag}]`;
    });
  } else if (/^tags:\s*(.+)$/m.test(yaml)) {
    yaml = yaml.replace(/^tags:\s*(.+)$/m, (_line, existing) => `tags:\n  - ${existing}\n  - ${quotedTag}`);
  } else {
    yaml = `tags:\n  - ${quotedTag}${yaml.trim() ? `\n${yaml}` : ''}`;
  }

  return `---\n${yaml}\n---\n${body}`;
}

export async function createProject(
  vault: Vault,
  name: string,
  startDate: string,
  endDate: string
): Promise<void> {
  const task: Task = {
    id: crypto.randomUUID(),
    text: `Project start: ${name}`,
    done: false,
    priority: 'high',
    tags: [`project/${name}`],
    deadline: endDate,
  };

  const path = `日记/${startDate}.md`;
  const file = vault.getFileByPath(path);

  if (!file) {
    const content = serializeFrontmatter(
      [task],
      `# ${name}\n\nFrom ${startDate} to ${endDate}\n\n\`\`\`memo-gantt\nproject: ${name}\n\`\`\``
    );
    await vault.create(path, content);
  } else {
    await vault.process(file, (content) => {
      const withFm = ensureFrontmatter(content);
      const parsed = parseFrontmatter(withFm);
      const tasks = parsed?.tasks ?? [];
      tasks.push(task);
      const body = parsed?.body ?? '';
      const updated = ensureFrontmatter(serializeFrontmatter(tasks, body, parsed?.yaml ?? ''));
      return addTagToFrontmatter(updated, `project/${name}`);
    });
  }
}
