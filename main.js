"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => MemoCalendarPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/CalendarView.ts
var import_obsidian2 = require("obsidian");

// src/types.ts
var VIEW_TYPE_CALENDAR = "supermemo-view";
var DIARY_FOLDER = "\u65E5\u8BB0";
var PRIORITY_COLORS = {
  high: "#ff6b6b",
  medium: "#ffd93d",
  low: "#6bcf7f"
};
function generateId() {
  return crypto.randomUUID();
}
function todayStr() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseDateOnly(date) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day)
    return new Date(date);
  return new Date(year, month - 1, day);
}
function dateOnlyDaysBetween(start, end) {
  const startDate = typeof start === "string" ? parseDateOnly(start) : start;
  const endDate = typeof end === "string" ? parseDateOnly(end) : end;
  const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endUtc = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.round((endUtc - startUtc) / (1e3 * 60 * 60 * 24));
}
function addDays(date, days) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

// src/scanner.ts
var import_obsidian = require("obsidian");
var DIARY_RE = /^\d{4}-\d{2}-\d{2}\.md$/;
function scanDiaryFiles(vault) {
  const folder = vault.getFolderByPath(DIARY_FOLDER);
  if (!folder)
    return [];
  const files = folder.children?.filter(
    (f) => f instanceof import_obsidian.TFile && DIARY_RE.test(f.name)
  ) || [];
  return files;
}
function diaryPath(date) {
  return `${DIARY_FOLDER}/${date}.md`;
}
async function ensureDiaryFolder(vault) {
  const exists = vault.getFolderByPath(DIARY_FOLDER);
  if (!exists) {
    await vault.createFolder(DIARY_FOLDER);
  }
}

// src/parser.ts
var FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
function parseFrontmatter(content) {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return null;
  }
  const yamlBlock = match[1];
  const body = match[2] || "";
  const tasks = [];
  const lines = yamlBlock.split("\n");
  let inTasks = false;
  let currentTask = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "tasks:") {
      inTasks = true;
      continue;
    }
    if (inTasks && trimmed.startsWith("-")) {
      pushTask(tasks, currentTask);
      currentTask = {};
      const inline = trimmed.replace(/^-\s*/, "");
      parseTaskInline(inline, currentTask);
      continue;
    }
    if (inTasks && currentTask && trimmed !== "") {
      parseTaskProperty(trimmed, currentTask);
    }
    if (inTasks && trimmed === "" && currentTask) {
      continue;
    }
    if (inTasks && !trimmed.startsWith("-") && !trimmed.startsWith("  ") && !trimmed.startsWith("	")) {
      pushTask(tasks, currentTask);
      currentTask = null;
      inTasks = false;
    }
  }
  pushTask(tasks, currentTask);
  return { tasks, body, yaml: yamlBlock };
}
function pushTask(tasks, task) {
  if (!task || !task.id || task.text === void 0)
    return;
  tasks.push(normalizeTask(task));
}
function normalizeTask(task) {
  const normalized = {
    id: task.id,
    text: task.text,
    done: task.done ?? false,
    priority: task.priority ?? "medium",
    tags: task.tags ?? []
  };
  if (task.deadline)
    normalized.deadline = task.deadline;
  if (task.reminder)
    normalized.reminder = task.reminder;
  return normalized;
}
function parseTaskInline(line, task) {
  const parts = splitByComma(line);
  for (const part of parts) {
    parseTaskProperty(part.trim(), task);
  }
}
function splitByComma(str) {
  const result = [];
  let current = "";
  let inQuotes = false;
  let inBrackets = 0;
  for (const ch of str) {
    if (ch === '"')
      inQuotes = !inQuotes;
    if (ch === "[" && !inQuotes)
      inBrackets++;
    if (ch === "]" && !inQuotes)
      inBrackets--;
    if (ch === "," && !inQuotes && inBrackets === 0) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim())
    result.push(current);
  return result;
}
function parseTaskProperty(trimmed, task) {
  const colonIdx = trimmed.indexOf(":");
  if (colonIdx === -1)
    return;
  const key = trimmed.slice(0, colonIdx).trim();
  let value = trimmed.slice(colonIdx + 1).trim();
  value = value.replace(/^"(.*)"$/, "$1");
  value = value.replace(/\\"/g, '"');
  switch (key) {
    case "id":
      task.id = value;
      break;
    case "text":
      task.text = value;
      break;
    case "done":
      task.done = value === "true";
      break;
    case "priority":
      task.priority = value === "high" || value === "low" ? value : "medium";
      break;
    case "deadline":
      task.deadline = value;
      break;
    case "reminder":
      if (value === "1day" || value === "3days" || value === "1week") {
        task.reminder = value;
      }
      break;
    case "tags": {
      const arrMatch = value.match(/^\[(.*)\]$/);
      if (arrMatch) {
        task.tags = arrMatch[1].split(",").map((t) => t.trim().replace(/^"(.*)"$/, "$1").replace(/\\"/g, '"')).filter(Boolean);
      }
      break;
    }
  }
}
function serializeFrontmatter(tasks, body, existingYaml = "") {
  const preservedYaml = removeTasksBlock(existingYaml).trimEnd();
  const tasksYaml = serializeTasks(tasks);
  const yamlBlock = [preservedYaml, tasksYaml].filter(Boolean).join("\n");
  return yamlBlock ? `---
${yamlBlock}
---
${body}` : `---
---
${body}`;
}
function serializeTasks(tasks) {
  if (tasks.length === 0)
    return "";
  const yamlTasks = tasks.map((t) => {
    const tags = `[${t.tags.map((x) => `"${x.replace(/"/g, '\\"')}"`).join(", ")}]`;
    const deadlineLine = t.deadline ? `
    deadline: "${t.deadline}"` : "";
    const reminderLine = t.reminder ? `
    reminder: ${t.reminder}` : "";
    return `  - id: "${t.id}"
    text: "${t.text.replace(/"/g, '\\"')}"
    done: ${t.done}
    priority: ${t.priority}
    tags: ${tags}${deadlineLine}${reminderLine}`;
  }).join("\n");
  return `tasks:
${yamlTasks}`;
}
function removeTasksBlock(yaml) {
  const lines = yaml.split("\n");
  const kept = [];
  let skippingTasks = false;
  for (const line of lines) {
    if (!skippingTasks && /^tasks:\s*$/.test(line)) {
      skippingTasks = true;
      continue;
    }
    if (skippingTasks) {
      const startsNextTopLevelKey = /^\S[^:]*:\s*/.test(line);
      if (startsNextTopLevelKey) {
        skippingTasks = false;
      } else {
        continue;
      }
    }
    kept.push(line);
  }
  return kept.join("\n");
}
function ensureFrontmatter(content) {
  if (FRONTMATTER_RE.test(content))
    return content;
  return `---
---
${content}`;
}

// src/taskManager.ts
var TaskManager = class {
  constructor(vault) {
    this.vault = vault;
  }
  async getDay(date) {
    const path = diaryPath(date);
    const file = this.vault.getFileByPath(path);
    if (!file) {
      return { date, path, tasks: [], body: "" };
    }
    const content = await this.vault.read(file);
    const parsed = parseFrontmatter(content);
    return {
      date,
      path,
      tasks: parsed?.tasks ?? [],
      body: parsed?.body ?? content
    };
  }
  async addTask(date, text, priority = "medium", deadline, reminder, tags = []) {
    const task = {
      id: generateId(),
      text,
      done: false,
      priority,
      tags
    };
    if (deadline)
      task.deadline = deadline;
    if (reminder)
      task.reminder = reminder;
    const path = diaryPath(date);
    const file = this.vault.getFileByPath(path);
    if (!file) {
      const content = serializeFrontmatter([task], "");
      await this.vault.create(path, content);
      return task;
    }
    await this.vault.process(file, (content) => {
      const withFm = ensureFrontmatter(content);
      const parsed = parseFrontmatter(withFm);
      const tasks = parsed?.tasks ?? [];
      tasks.push(task);
      return serializeFrontmatter(tasks, parsed?.body ?? "", parsed?.yaml ?? "");
    });
    return task;
  }
  async updateTask(date, taskId, updates) {
    const path = diaryPath(date);
    const file = this.vault.getFileByPath(path);
    if (!file)
      return;
    await this.vault.process(file, (content) => {
      const withFm = ensureFrontmatter(content);
      const parsed = parseFrontmatter(withFm);
      if (!parsed)
        return content;
      const tasks = parsed.tasks.map(
        (t) => t.id === taskId ? { ...t, ...updates } : t
      );
      return serializeFrontmatter(tasks, parsed.body, parsed.yaml);
    });
  }
  async deleteTask(date, taskId) {
    const path = diaryPath(date);
    const file = this.vault.getFileByPath(path);
    if (!file)
      return;
    await this.vault.process(file, (content) => {
      const withFm = ensureFrontmatter(content);
      const parsed = parseFrontmatter(withFm);
      if (!parsed)
        return content;
      const tasks = parsed.tasks.filter((t) => t.id !== taskId);
      return serializeFrontmatter(tasks, parsed.body, parsed.yaml);
    });
  }
  async appendBody(date, text) {
    const path = diaryPath(date);
    const file = this.vault.getFileByPath(path);
    if (!file) {
      const content = `---
---
${text}
`;
      await this.vault.create(path, content);
      return;
    }
    await this.vault.process(file, (content) => {
      const withFm = ensureFrontmatter(content);
      const parsed = parseFrontmatter(withFm);
      if (!parsed)
        return content;
      const newBody = parsed.body + "\n" + text;
      return serializeFrontmatter(parsed.tasks, newBody, parsed.yaml);
    });
  }
};

// src/reminder.ts
var REMINDER_DAYS = {
  "1day": 1,
  "3days": 3,
  "1week": 7
};
async function getOverdueTasks(vault) {
  const files = scanDiaryFiles(vault);
  const today = todayStr();
  const result = [];
  for (const file of files) {
    const date = file.name.replace(/\.md$/, "");
    if (date > today)
      continue;
    const content = await vault.read(file);
    const parsed = parseFrontmatter(content);
    if (!parsed)
      continue;
    for (const task of parsed.tasks) {
      if (!task.done) {
        result.push({ date, task, path: file.path });
      }
    }
  }
  return result;
}
async function dailyTaskCounts(vault, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const files = scanDiaryFiles(vault).filter((f) => f.name.startsWith(prefix));
  const map = /* @__PURE__ */ new Map();
  for (const file of files) {
    const day = parseInt(file.name.slice(8, 10), 10);
    if (isNaN(day))
      continue;
    const content = await vault.read(file);
    const taskCount = (content.match(/\n\s+-\s+id:/g) || []).length;
    if (taskCount > 0) {
      map.set(day, (map.get(day) || 0) + taskCount);
    }
  }
  return map;
}
var firedReminders = /* @__PURE__ */ new Set();
async function checkReminders(vault) {
  const files = scanDiaryFiles(vault);
  const today = todayStr();
  const alerts = [];
  for (const file of files) {
    const content = await vault.read(file);
    const parsed = parseFrontmatter(content);
    if (!parsed)
      continue;
    for (const task of parsed.tasks) {
      if (task.done)
        continue;
      if (!task.deadline || !task.reminder)
        continue;
      const reminderKey = `${task.id}:${task.reminder}`;
      if (firedReminders.has(reminderKey))
        continue;
      const daysUntil = dateOnlyDaysBetween(today, task.deadline);
      const threshold = REMINDER_DAYS[task.reminder];
      if (daysUntil <= threshold && daysUntil >= 0) {
        alerts.push({
          task,
          date: file.name.replace(/\.md$/, ""),
          path: file.path,
          offset: task.reminder,
          daysUntil
        });
        firedReminders.add(reminderKey);
      }
    }
  }
  return alerts;
}
function fireReminderNotification(alert) {
  try {
    const when = alert.daysUntil === 0 ? "today" : alert.daysUntil === 1 ? "tomorrow" : `in ${alert.daysUntil} days`;
    const title = `\u23F0 Task Reminder`;
    const body = `"${alert.task.text}" is due ${when} (${alert.task.deadline})`;
    const n = new Notification(title, {
      body,
      silent: false
    });
    n.addEventListener("click", () => {
      n.close();
    });
  } catch (_e) {
  }
}
function requestNotificationPermission() {
  if (typeof Notification === "undefined")
    return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}
function resetReminders() {
  firedReminders.clear();
}

// src/projectManager.ts
function extractNoteTags(yamlBlock) {
  const tags = [];
  const inlineArray = yamlBlock.match(/^tags:\s*\[([^\]]+)\]/m);
  if (inlineArray) {
    for (const part of inlineArray[1].split(",")) {
      const cleaned = part.trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
      if (cleaned)
        tags.push(cleaned);
    }
    return tags;
  }
  const singleLine = yamlBlock.match(/^tags:\s*"?([^"\n\[\]]+)"?\s*$/m);
  if (singleLine) {
    const val = singleLine[1].trim();
    if (val && !val.startsWith("-")) {
      tags.push(val);
      return tags;
    }
  }
  const tagsSection = yamlBlock.match(/^tags:\s*\n([\s\S]*?)(?=\n\S|$)/m);
  if (tagsSection) {
    const tagLines = tagsSection[1].matchAll(/^\s*-\s*"?([^"\n]+)"?\s*$/gm);
    for (const m of tagLines) {
      tags.push(m[1].trim());
    }
  }
  const tagMatch = yamlBlock.match(/^tag:\s*"?([^"\n]+)"?\s*$/m);
  if (tagMatch) {
    tags.push(tagMatch[1].trim());
  }
  return tags;
}
function extractBodyTags(body) {
  const tags = [];
  const re = /#([\w-]+(?:\/[\w-]+)*)/g;
  let match;
  while ((match = re.exec(body)) !== null) {
    tags.push(match[1]);
  }
  return tags;
}
function isProjectTag(tag) {
  return tag === "project" || tag.startsWith("project/");
}
async function getProjects(vault) {
  const diaryFiles = scanDiaryFiles(vault);
  const diaryPaths = new Set(diaryFiles.map((f) => f.path));
  const projectMap = /* @__PURE__ */ new Map();
  const allFiles = vault.getMarkdownFiles();
  async function processFile(file, isDiary) {
    const content = await vault.read(file);
    const parsed = parseFrontmatter(content);
    if (!parsed)
      return;
    const noteDate = isDiary ? file.name.replace(/\.md$/, "") : void 0;
    const noteProjectTags = /* @__PURE__ */ new Set();
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (fmMatch) {
      for (const tag of extractNoteTags(fmMatch[1])) {
        if (isProjectTag(tag))
          noteProjectTags.add(tag);
      }
    }
    for (const tag of extractBodyTags(parsed.body)) {
      if (isProjectTag(tag))
        noteProjectTags.add(tag);
    }
    for (const task of parsed.tasks) {
      const taskProjectTags = task.tags.filter(isProjectTag);
      const tagsForTask = taskProjectTags.length > 0 ? taskProjectTags : [...noteProjectTags];
      for (const projectTag of tagsForTask) {
        const name = projectTag.replace("project/", "");
        if (!projectMap.has(name))
          projectMap.set(name, []);
        const existing = projectMap.get(name);
        if (!existing.some((e) => e.task.id === task.id && e.notePath === file.path)) {
          existing.push({ date: noteDate ?? task.deadline ?? todayStr(), task, notePath: file.path });
        }
      }
    }
  }
  for (const file of diaryFiles) {
    await processFile(file, true);
  }
  for (const file of allFiles) {
    if (!diaryPaths.has(file.path)) {
      await processFile(file, false);
    }
  }
  const projects = [];
  for (const [name, entries] of projectMap) {
    if (entries.length === 0)
      continue;
    const dates = entries.map((e) => e.date).filter(Boolean).sort();
    const doneCount = entries.filter((e) => e.task.done).length;
    const taskWithDeadline = entries.find((e) => e.task.deadline);
    projects.push({
      name,
      tag: `project/${name}`,
      tasks: entries,
      startDate: dates[0] || todayStr(),
      endDate: taskWithDeadline?.task.deadline || dates[dates.length - 1] || todayStr(),
      doneCount,
      totalCount: entries.length
    });
  }
  projects.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return projects;
}
function addTagToFrontmatter(content, tag) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match)
    return content;
  let yaml = match[1];
  if (yaml.includes(tag))
    return content;
  const body = match[2] ?? "";
  const quotedTag = `"${tag.replace(/"/g, '\\"')}"`;
  if (/^tags:\s*\n/m.test(yaml)) {
    yaml = yaml.replace(/^tags:\s*\n/m, `tags:
  - ${quotedTag}
`);
  } else if (/^tags:\s*\[([^\]]*)\]\s*$/m.test(yaml)) {
    yaml = yaml.replace(/^tags:\s*\[([^\]]*)\]\s*$/m, (_line, tags) => {
      const prefix = String(tags).trim();
      return `tags: [${prefix ? `${prefix}, ` : ""}${quotedTag}]`;
    });
  } else if (/^tags:\s*(.+)$/m.test(yaml)) {
    yaml = yaml.replace(/^tags:\s*(.+)$/m, (_line, existing) => `tags:
  - ${existing}
  - ${quotedTag}`);
  } else {
    yaml = `tags:
  - ${quotedTag}${yaml.trim() ? `
${yaml}` : ""}`;
  }
  return `---
${yaml}
---
${body}`;
}
async function createProject(vault, name, startDate, endDate) {
  const task = {
    id: crypto.randomUUID(),
    text: `Project start: ${name}`,
    done: false,
    priority: "high",
    tags: [`project/${name}`],
    deadline: endDate
  };
  const path = `\u65E5\u8BB0/${startDate}.md`;
  const file = vault.getFileByPath(path);
  if (!file) {
    const content = serializeFrontmatter(
      [task],
      `# ${name}

From ${startDate} to ${endDate}

\`\`\`memo-gantt
project: ${name}
\`\`\``
    );
    await vault.create(path, content);
  } else {
    await vault.process(file, (content) => {
      const withFm = ensureFrontmatter(content);
      const parsed = parseFrontmatter(withFm);
      const tasks = parsed?.tasks ?? [];
      tasks.push(task);
      const body = parsed?.body ?? "";
      const updated = ensureFrontmatter(serializeFrontmatter(tasks, body, parsed?.yaml ?? ""));
      return addTagToFrontmatter(updated, `project/${name}`);
    });
  }
}

// src/GanttChart.ts
async function renderGanttChart(container, vault, projectFilter) {
  const allProjects = await getProjects(vault);
  const projects = projectFilter ? allProjects.filter((p) => p.name === projectFilter || p.tag === projectFilter) : allProjects;
  if (projects.length === 0) {
    container.createDiv("mc-empty-state").setText(
      projectFilter ? `No project "${projectFilter}" found.` : "No projects to chart."
    );
    return;
  }
  const today = todayStr();
  let minDate = today;
  let maxDate = today;
  for (const p of projects) {
    if (p.startDate < minDate)
      minDate = p.startDate;
    if (p.endDate > maxDate)
      maxDate = p.endDate;
  }
  const minD = parseDateOnly(minDate);
  const rangeDays = Math.max(dateOnlyDaysBetween(minD, maxDate) + 1, 14);
  const chart = container.createDiv("mc-gantt-chart");
  const headerRow = chart.createDiv("mc-gantt-header-row");
  headerRow.createDiv("mc-gantt-label-col").setText("Project");
  const timelineHeader = headerRow.createDiv("mc-gantt-timeline-col");
  const totalDays = rangeDays;
  const dayWidth = Math.max(24, Math.floor(600 / totalDays));
  const todayPos = Math.floor(
    dateOnlyDaysBetween(minD, today)
  );
  for (let i = 0; i < totalDays; i++) {
    const d = addDays(minD, i);
    const label = d.getDate() === 1 || i === 0 || i === totalDays - 1 ? `${d.getMonth() + 1}/${d.getDate()}` : d.getDate() % 5 === 0 ? String(d.getDate()) : "";
    const dayCell = timelineHeader.createDiv("mc-gantt-day-cell");
    dayCell.setText(label);
    dayCell.style.width = `${dayWidth}px`;
  }
  const markerLine = chart.createDiv("mc-gantt-today-marker");
  markerLine.style.left = `calc(120px + ${todayPos * dayWidth}px)`;
  markerLine.createDiv("mc-gantt-today-label").setText("Today");
  for (const project of projects) {
    const row = chart.createDiv("mc-gantt-row");
    const labelCol = row.createDiv("mc-gantt-label-col");
    const pct = project.totalCount > 0 ? Math.round(project.doneCount / project.totalCount * 100) : 0;
    labelCol.createSpan({ text: project.name, cls: "mc-gantt-project-name" });
    labelCol.createSpan({ text: `${pct}%`, cls: "mc-gantt-project-pct" });
    const barArea = row.createDiv("mc-gantt-timeline-col");
    const startOffset = Math.max(
      0,
      dateOnlyDaysBetween(minD, project.startDate)
    );
    const duration = Math.max(
      1,
      dateOnlyDaysBetween(project.startDate, project.endDate) + 1
    );
    const bar = barArea.createDiv("mc-gantt-bar");
    bar.style.marginLeft = `${startOffset * dayWidth}px`;
    bar.style.width = `${duration * dayWidth - 4}px`;
    if (pct === 100) {
      bar.addClass("mc-gantt-bar-done");
    } else if (project.tasks.some((t) => t.date < today && !t.task.done)) {
      bar.addClass("mc-gantt-bar-overdue");
    } else {
      bar.addClass("mc-gantt-bar-ontrack");
    }
    bar.setText(`${project.startDate} \u2192 ${project.endDate}`);
    const taskWithDeadline = project.tasks.find((t) => t.task.deadline);
    if (taskWithDeadline?.task.deadline) {
      const dlOffset = dateOnlyDaysBetween(minD, taskWithDeadline.task.deadline);
      const dlMarker = barArea.createDiv("mc-gantt-deadline");
      dlMarker.style.marginLeft = `${dlOffset * dayWidth - 4}px`;
      dlMarker.setAttr("title", `Deadline: ${taskWithDeadline.task.deadline}`);
    }
  }
}
function parseGanttBlock(source) {
  const result = {};
  for (const line of source.split("\n")) {
    const m = line.match(/^project:\s*(.+)$/);
    if (m) {
      result.project = m[1].trim();
    }
  }
  return result;
}

// src/CalendarView.ts
var CalendarView = class extends import_obsidian2.ItemView {
  constructor(leaf, vault) {
    super(leaf);
    this.overdueTasks = [];
    this.refreshTimer = null;
    this.taskManager = new TaskManager(vault);
    const now = /* @__PURE__ */ new Date();
    this.state = {
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth(),
      selectedDate: todayStr()
    };
    this.viewMode = "calendar";
  }
  getViewType() {
    return VIEW_TYPE_CALENDAR;
  }
  getDisplayText() {
    return "Memo Calendar";
  }
  getIcon() {
    return "calendar-days";
  }
  async onOpen() {
    this.registerEvent(this.app.vault.on("create", () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on("modify", () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on("delete", () => this.scheduleRefresh()));
    this.refresh();
  }
  async onClose() {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
  scheduleRefresh() {
    if (this.refreshTimer !== null)
      window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      this.refresh();
    }, 250);
  }
  async refresh() {
    const container = this.contentEl;
    container.empty();
    const vault = this.app.vault;
    this.overdueTasks = await getOverdueTasks(vault);
    const wrapper = container.createDiv("mc-wrapper");
    this.renderHeader(wrapper);
    if (this.viewMode === "calendar") {
      const body = wrapper.createDiv("mc-body");
      const leftPanel = body.createDiv("mc-left-panel");
      await this.renderCalendarGrid(leftPanel);
      const rightPanel = body.createDiv("mc-right-panel");
      await this.renderDayDetail(rightPanel);
    } else {
      await this.renderProjectsView(wrapper);
    }
    await this.renderReminderBanner(wrapper);
  }
  renderHeader(container) {
    const header = container.createDiv("mc-header");
    const prev = header.createEl("button", { text: "\u25C0", cls: "mc-nav-btn" });
    const title = header.createDiv("mc-title");
    this.updateTitle(title);
    const next = header.createEl("button", { text: "\u25B6", cls: "mc-nav-btn" });
    prev.addEventListener("click", () => {
      if (this.state.currentMonth === 0) {
        this.state.currentMonth = 11;
        this.state.currentYear--;
      } else {
        this.state.currentMonth--;
      }
      this.refresh();
    });
    next.addEventListener("click", () => {
      if (this.state.currentMonth === 11) {
        this.state.currentMonth = 0;
        this.state.currentYear++;
      } else {
        this.state.currentMonth++;
      }
      this.refresh();
    });
    const todayBtn = header.createEl("button", { text: "Today", cls: "mc-today-btn" });
    todayBtn.addEventListener("click", () => {
      const now = /* @__PURE__ */ new Date();
      this.state.currentYear = now.getFullYear();
      this.state.currentMonth = now.getMonth();
      this.state.selectedDate = todayStr();
      this.refresh();
    });
    const toggleContainer = header.createDiv("mc-view-toggle");
    const calBtn = toggleContainer.createEl("button", {
      text: "Calendar",
      cls: this.viewMode === "calendar" ? "mc-toggle-btn mc-toggle-active" : "mc-toggle-btn"
    });
    const projBtn = toggleContainer.createEl("button", {
      text: "Projects",
      cls: this.viewMode === "projects" ? "mc-toggle-btn mc-toggle-active" : "mc-toggle-btn"
    });
    calBtn.addEventListener("click", () => {
      this.viewMode = "calendar";
      this.refresh();
    });
    projBtn.addEventListener("click", () => {
      this.viewMode = "projects";
      this.refresh();
    });
  }
  updateTitle(el) {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];
    el.setText(`${months[this.state.currentMonth]} ${this.state.currentYear}`);
  }
  async renderCalendarGrid(container) {
    const grid = container.createDiv("mc-calendar-grid");
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (const name of dayNames) {
      grid.createDiv("mc-day-header").setText(name);
    }
    const year = this.state.currentYear;
    const month = this.state.currentMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const taskCounts = await dailyTaskCounts(this.app.vault, year, month);
    const overdueDates = new Set(
      this.overdueTasks.filter((t) => t.date.startsWith(
        `${year}-${String(month + 1).padStart(2, "0")}`
      )).map((t) => t.date.slice(8))
    );
    const today = todayStr();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < startOffset; i++) {
      const day = prevMonthDays - startOffset + i + 1;
      const cell = grid.createDiv("mc-day-cell mc-day-other");
      cell.createDiv("mc-day-num").setText(String(day));
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isSelected = dateStr === this.state.selectedDate;
      const isToday = dateStr === today;
      const cell = grid.createDiv("mc-day-cell");
      if (isSelected)
        cell.addClass("mc-day-selected");
      if (isToday)
        cell.addClass("mc-day-today");
      const numEl = cell.createDiv("mc-day-num");
      numEl.setText(String(day));
      const count = taskCounts.get(day);
      if (count && count > 0) {
        const dots = cell.createDiv("mc-day-dots");
        for (let j = 0; j < Math.min(count, 3); j++) {
          dots.createDiv("mc-dot");
        }
        if (count > 3) {
          dots.createSpan({ cls: "mc-dot-more", text: `+${count - 3}` });
        }
      }
      if (overdueDates.has(String(day))) {
        cell.createDiv("mc-overdue-dot");
      }
      cell.addEventListener("click", () => {
        this.state.selectedDate = dateStr;
        this.refresh();
      });
      cell.setAttr("tabindex", "0");
      cell.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.state.selectedDate = dateStr;
          this.refresh();
        }
      });
    }
    const totalCells = startOffset + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - totalCells % 7;
    for (let day = 1; day <= remainingCells; day++) {
      const cell = grid.createDiv("mc-day-cell mc-day-other");
      cell.createDiv("mc-day-num").setText(String(day));
    }
  }
  async renderDayDetail(container) {
    const vault = this.app.vault;
    const date = this.state.selectedDate || todayStr();
    const dayData = await this.taskManager.getDay(date);
    container.empty();
    const dateHeader = container.createDiv("mc-date-header");
    const d = parseDateOnly(dayData.date);
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];
    dateHeader.createDiv("mc-date-title").setText(`${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`);
    dateHeader.createDiv("mc-date-weekday").setText(weekdays[d.getDay()]);
    const taskSection = container.createDiv("mc-task-section");
    const taskHeader = taskSection.createDiv("mc-section-header");
    taskHeader.createSpan({ text: "Tasks", cls: "mc-section-label" });
    const addBtn = taskHeader.createEl("button", { text: "+", cls: "mc-add-btn" });
    addBtn.addEventListener("click", () => {
      this.showAddTaskOverlay(taskSection, date);
    });
    const taskList = taskSection.createDiv("mc-task-list");
    if (dayData.tasks.length === 0) {
      taskList.createDiv("mc-empty-state").setText("No tasks for this day. Click + to add.");
    }
    for (const task of dayData.tasks) {
      const taskEl = taskList.createDiv("mc-task-item");
      if (task.done)
        taskEl.addClass("mc-task-done");
      const checkbox = taskEl.createDiv("mc-checkbox");
      if (task.done)
        checkbox.addClass("mc-checkbox-checked");
      checkbox.addEventListener("click", async (e) => {
        e.stopPropagation();
        const newDone = !task.done;
        task.done = newDone;
        if (newDone) {
          checkbox.addClass("mc-checkbox-checked");
          taskEl.addClass("mc-task-done");
        } else {
          checkbox.removeClass("mc-checkbox-checked");
          taskEl.removeClass("mc-task-done");
        }
        await this.taskManager.updateTask(date, task.id, { done: newDone });
      });
      const priorityDot = taskEl.createDiv("mc-priority-dot");
      priorityDot.style.backgroundColor = PRIORITY_COLORS[task.priority];
      taskEl.createSpan({ text: task.text, cls: "mc-task-text" });
      if (task.deadline) {
        taskEl.createSpan({ text: `\u23F0 ${task.deadline}`, cls: "mc-task-deadline" });
      }
      if (task.reminder) {
        const reminderLabels = { "1day": "\u{1F514}1d", "3days": "\u{1F514}3d", "1week": "\u{1F514}1w" };
        taskEl.createSpan({ text: reminderLabels[task.reminder] || "", cls: "mc-task-reminder" });
      }
      for (const tag of task.tags) {
        taskEl.createSpan({ text: `#${tag}`, cls: "mc-task-tag" });
      }
      const deleteBtn = taskEl.createEl("button", { text: "\xD7", cls: "mc-delete-btn" });
      deleteBtn.addEventListener("click", async () => {
        await this.taskManager.deleteTask(date, task.id);
        this.refresh();
      });
    }
    container.createDiv("mc-divider");
    const bodySection = container.createDiv("mc-body-section");
    const bodyHeader = bodySection.createDiv("mc-section-header");
    bodyHeader.createSpan({ text: "Work Log", cls: "mc-section-label" });
    const newProjBtn = bodyHeader.createEl("button", { text: "+Project", cls: "mc-proj-btn" });
    newProjBtn.addEventListener("click", () => {
      this.showAddProjectOverlay(bodySection, date);
    });
    const openBtn = bodyHeader.createEl("button", { text: "Edit", cls: "mc-edit-btn" });
    openBtn.addEventListener("click", () => {
      const path = diaryPath(date);
      const file = vault.getFileByPath(path);
      if (file) {
        this.app.workspace.getLeaf().openFile(file);
      } else {
        this.app.workspace.openLinkText(date, "\u65E5\u8BB0/", true);
      }
    });
    if (dayData.body.trim()) {
      const bodyContent = bodySection.createDiv("mc-body-content");
      await import_obsidian2.MarkdownRenderer.renderMarkdown(dayData.body, bodyContent, dayData.path, this);
    } else {
      bodySection.createDiv("mc-empty-state").setText("No work log yet. Open this file in Obsidian to write.");
    }
  }
  async renderProjectsView(container) {
    const vault = this.app.vault;
    const projects = await getProjects(vault);
    const body = container.createDiv("mc-projects-body");
    const header = body.createDiv("mc-section-header");
    header.createSpan({ text: "Active Projects", cls: "mc-section-label" });
    const addProjBtn = header.createEl("button", { text: "+ New", cls: "mc-add-btn" });
    addProjBtn.addEventListener("click", () => {
      this.showAddProjectOverlay(body, todayStr());
    });
    if (projects.length === 0) {
      body.createDiv("mc-empty-state").setText(
        "No projects yet. Add #project/xxx tags to your tasks, or click + New."
      );
      return;
    }
    for (const project of projects) {
      const card = body.createDiv("mc-project-card");
      const cardHeader = card.createDiv("mc-project-header");
      const info = cardHeader.createDiv("mc-project-info");
      const pct = project.totalCount > 0 ? Math.round(project.doneCount / project.totalCount * 100) : 0;
      info.createSpan({ text: project.name, cls: "mc-project-name" });
      info.createSpan({ text: `${pct}%`, cls: "mc-project-pct" });
      const taskWithDeadline = project.tasks.find((t) => t.task.deadline);
      const dateText = taskWithDeadline?.task.deadline ? `${project.startDate} \u2192 ${taskWithDeadline.task.deadline} (deadline)` : `${project.startDate} \u2192 ${project.endDate}`;
      cardHeader.createSpan({
        text: dateText,
        cls: "mc-project-dates"
      });
      const bar = card.createDiv("mc-progress-bar");
      const fill = bar.createDiv("mc-progress-fill");
      fill.style.width = `${pct}%`;
      if (pct === 100) {
        fill.addClass("mc-progress-done");
      } else if (project.tasks.some((t) => t.date < todayStr() && !t.task.done)) {
        fill.addClass("mc-progress-overdue");
      } else {
        fill.addClass("mc-progress-ontrack");
      }
      const details = card.createDiv("mc-project-details");
      details.setText(`${project.doneCount}/${project.totalCount} tasks done`);
      const overdueCount = project.tasks.filter(
        (t) => t.date < todayStr() && !t.task.done
      ).length;
      if (overdueCount > 0) {
        details.createSpan({ text: ` \xB7 \u26A0 ${overdueCount} overdue`, cls: "mc-project-warning" });
      }
      card.addEventListener("click", () => {
        const taskList2 = card.querySelector(".mc-project-tasks");
        if (taskList2) {
          taskList2.style.display = taskList2.style.display === "none" ? "block" : "none";
        }
      });
      const taskList = card.createDiv("mc-project-tasks");
      taskList.style.display = "none";
      const sortedTasks = [...project.tasks].sort((a, b) => a.date.localeCompare(b.date));
      for (const entry of sortedTasks) {
        const row = taskList.createDiv("mc-project-task-row");
        const dot = row.createDiv("mc-priority-dot");
        dot.style.backgroundColor = entry.task.done ? "#6bcf7f" : entry.date < todayStr() ? "#ff6b6b" : "#ffd93d";
        const sourceBtn = row.createEl("button", { text: entry.date, cls: "mc-project-task-date mc-link-btn" });
        sourceBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const file = vault.getFileByPath(entry.notePath || diaryPath(entry.date));
          if (file)
            this.app.workspace.getLeaf().openFile(file);
        });
        row.createSpan({
          text: entry.task.text,
          cls: entry.task.done ? "mc-task-done" : ""
        });
        if (entry.task.deadline) {
          row.createSpan({
            text: `  \u23F0 ${entry.task.deadline}`,
            cls: "mc-project-deadline"
          });
        }
      }
    }
    const ganttSection = body.createDiv("mc-gantt-section");
    const ganttHeader = ganttSection.createDiv("mc-section-header");
    ganttHeader.createSpan({ text: "Gantt Chart", cls: "mc-section-label" });
    const ganttContainer = ganttSection.createDiv("mc-gantt-container");
    await renderGanttChart(ganttContainer, vault);
  }
  showAddProjectOverlay(container, startDate) {
    if (container.querySelector(".mc-add-project-form"))
      return;
    const form = container.createDiv("mc-add-project-form");
    const title = form.createDiv("mc-form-title");
    title.setText("New Project");
    const nameInput = form.createEl("input", {
      type: "text",
      placeholder: "Project name...",
      cls: "mc-task-input"
    });
    const dateRow = form.createDiv("mc-date-row");
    dateRow.createSpan({ text: "Start:", cls: "mc-date-label" });
    const startInput = dateRow.createEl("input", {
      type: "date",
      cls: "mc-date-input"
    });
    startInput.value = startDate;
    dateRow.createSpan({ text: "End:", cls: "mc-date-label" });
    const endInput = dateRow.createEl("input", {
      type: "date",
      cls: "mc-date-input"
    });
    const endDate = /* @__PURE__ */ new Date();
    endDate.setDate(endDate.getDate() + 14);
    endInput.value = endDate.toISOString().slice(0, 10);
    const hint = form.createDiv("mc-form-hint");
    hint.setText("Creates a project-tagged memo, an initial task, and a Gantt block. Use Ctrl/\u2318+Enter to save.");
    const btnRow = form.createDiv("mc-form-btns");
    const submitBtn = btnRow.createEl("button", { text: "Create project", cls: "mc-submit-btn" });
    const cancelBtn = btnRow.createEl("button", { text: "Cancel", cls: "mc-cancel-btn" });
    const submit = async () => {
      if (!nameInput.value.trim() || !startInput.value || !endInput.value || submitBtn.disabled)
        return;
      submitBtn.disabled = true;
      submitBtn.setText("Creating\u2026");
      try {
        const vault = this.app.vault;
        await createProject(vault, nameInput.value.trim(), startInput.value, endInput.value);
        form.remove();
        await this.refresh();
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.setText("Create project");
        new import_obsidian2.Notice(`Failed to create project: ${err}`);
      }
    };
    submitBtn.addEventListener("click", submit);
    cancelBtn.addEventListener("click", () => form.remove());
    form.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        submit();
      }
    });
    nameInput.focus();
  }
  showAddTaskOverlay(container, date) {
    if (container.querySelector(".mc-add-task-form"))
      return;
    const form = container.createDiv("mc-add-task-form");
    const inputRow = form.createDiv("mc-task-input-row");
    const input = inputRow.createEl("input", {
      type: "text",
      placeholder: "Task description...",
      cls: "mc-task-input"
    });
    const prioritySelect = inputRow.createEl("select", { cls: "mc-priority-select" });
    prioritySelect.innerHTML = `
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="low">Low</option>
    `;
    const metaRow = form.createDiv("mc-deadline-row");
    metaRow.createSpan({ text: "Deadline:", cls: "mc-date-label" });
    const deadlineInput = metaRow.createEl("input", {
      type: "date",
      cls: "mc-date-input"
    });
    metaRow.createSpan({ text: "Remind:", cls: "mc-date-label" });
    const reminderSelect = metaRow.createEl("select", { cls: "mc-priority-select" });
    reminderSelect.innerHTML = `
      <option value="">No reminder</option>
      <option value="1day">1 day before</option>
      <option value="3days">3 days before</option>
      <option value="1week">1 week before</option>
    `;
    const tagRow = form.createDiv("mc-tag-row");
    tagRow.createSpan({ text: "Tags:", cls: "mc-date-label" });
    const tagInput = tagRow.createEl("input", {
      type: "text",
      placeholder: "project/app, writing, #context",
      cls: "mc-task-input mc-tag-input"
    });
    const btnRow = form.createDiv("mc-form-btns");
    const submitBtn = btnRow.createEl("button", { text: "Add task", cls: "mc-submit-btn" });
    const cancelBtn = btnRow.createEl("button", { text: "Cancel", cls: "mc-cancel-btn" });
    const submit = async () => {
      const text = input.value.trim();
      if (!text || submitBtn.disabled)
        return;
      submitBtn.disabled = true;
      submitBtn.setText("Adding\u2026");
      try {
        const deadline = deadlineInput.value || void 0;
        const reminder = reminderSelect.value || void 0;
        await this.taskManager.addTask(
          date,
          text,
          prioritySelect.value,
          deadline,
          reminder,
          this.parseTagInput(tagInput.value)
        );
        form.remove();
        await this.refresh();
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.setText("Add task");
        new import_obsidian2.Notice(`Failed to add task: ${err}`);
      }
    };
    submitBtn.addEventListener("click", submit);
    cancelBtn.addEventListener("click", () => form.remove());
    form.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        submit();
      }
    });
    input.focus();
  }
  parseTagInput(value) {
    return [...new Set(value.split(/[ ,]+/).map((tag) => tag.replace(/^#/, "").trim()).filter(Boolean))];
  }
  async renderReminderBanner(container) {
    if (this.overdueTasks.length === 0)
      return;
    const banner = container.createDiv("mc-reminder-banner");
    const overdue = this.overdueTasks.filter((t) => t.date < todayStr());
    const today = this.overdueTasks.filter((t) => t.date === todayStr());
    if (overdue.length > 0) {
      const overdueEl = banner.createDiv("mc-reminder-overdue");
      overdueEl.createSpan({ text: `\u26A0 Overdue: ${overdue.length} task(s)` });
      for (const item of overdue.slice(0, 3)) {
        overdueEl.createDiv("mc-reminder-item").setText(
          `${item.date}: ${item.task.text}`
        );
      }
    }
    if (today.length > 0) {
      const todayEl = banner.createDiv("mc-reminder-today");
      todayEl.createSpan({ text: `\u{1F4CC} Today: ${today.length} task(s)` });
    }
  }
};

// src/main.ts
var REMINDER_INTERVAL_MS = 5 * 60 * 1e3;
var MemoCalendarPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this.reminderInterval = null;
  }
  async onload() {
    await ensureDiaryFolder(this.app.vault);
    this.registerView(
      VIEW_TYPE_CALENDAR,
      (leaf) => new CalendarView(leaf, this.app.vault)
    );
    this.addRibbonIcon("calendar-days", "Open Memo Calendar", () => {
      this.activateView();
    });
    this.addCommand({
      id: "open-memo-calendar",
      name: "Open Memo Calendar",
      callback: () => this.activateView()
    });
    this.registerMarkdownCodeBlockProcessor("memo-gantt", async (source, el) => {
      const params = parseGanttBlock(source);
      await renderGanttChart(el, this.app.vault, params.project);
    });
    this.registerMarkdownPostProcessor(async (el, ctx) => {
      await this.renderTaggedProjectGantt(el, ctx);
    }, 100);
    requestNotificationPermission();
    this.startReminderCheck();
  }
  async onunload() {
    this.stopReminderCheck();
    resetReminders();
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CALENDAR);
  }
  async activateView() {
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
  async renderTaggedProjectGantt(el, ctx) {
    const file = this.app.vault.getFileByPath(ctx.sourcePath);
    if (!file || !file.extension || file.extension !== "md")
      return;
    const section = ctx.getSectionInfo(el);
    if (section && section.lineStart > 0)
      return;
    const frontmatterTags = this.normalizeTags(ctx.frontmatter?.tags ?? ctx.frontmatter?.tag);
    const bodyTags = extractBodyTags(await this.app.vault.read(file));
    const projectTags = [...new Set([...frontmatterTags, ...bodyTags].filter(isProjectTag))];
    if (projectTags.length === 0)
      return;
    if (el.querySelector(".block-language-memo-gantt, .mc-note-gantt-module"))
      return;
    const projectFilter = projectTags.find((tag) => tag.startsWith("project/"))?.replace("project/", "");
    const module2 = el.createDiv("mc-note-gantt-module");
    const header = module2.createDiv("mc-note-gantt-header");
    header.createSpan({ text: projectFilter ? `Project timeline \xB7 ${projectFilter}` : "Project timeline", cls: "mc-section-label" });
    const chart = module2.createDiv("mc-gantt-container");
    await renderGanttChart(chart, this.app.vault, projectFilter);
  }
  normalizeTags(value) {
    if (Array.isArray(value)) {
      return value.map(String).map((tag) => tag.replace(/^#/, "").trim()).filter(Boolean);
    }
    if (typeof value === "string") {
      return value.split(/[ ,]+/).map((tag) => tag.replace(/^#/, "").trim()).filter(Boolean);
    }
    return [];
  }
  startReminderCheck() {
    this.runReminderCheck();
    this.reminderInterval = window.setInterval(() => {
      this.runReminderCheck();
    }, REMINDER_INTERVAL_MS);
    this.registerInterval(this.reminderInterval);
  }
  async runReminderCheck() {
    try {
      const alerts = await checkReminders(this.app.vault);
      for (const alert of alerts) {
        fireReminderNotification(alert);
      }
    } catch (_e) {
    }
  }
  stopReminderCheck() {
    if (this.reminderInterval !== null) {
      window.clearInterval(this.reminderInterval);
      this.reminderInterval = null;
    }
  }
};
