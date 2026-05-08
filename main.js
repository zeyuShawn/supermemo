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
var VIEW_TYPE_CALENDAR = "memo-calendar-view";
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
      if (currentTask && currentTask.id && currentTask.text !== void 0) {
        tasks.push({
          id: currentTask.id,
          text: currentTask.text,
          done: currentTask.done ?? false,
          priority: currentTask.priority ?? "medium",
          tags: currentTask.tags ?? []
        });
      }
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
      if (currentTask && currentTask.id && currentTask.text !== void 0) {
        tasks.push({
          id: currentTask.id,
          text: currentTask.text,
          done: currentTask.done ?? false,
          priority: currentTask.priority ?? "medium",
          tags: currentTask.tags ?? []
        });
      }
      currentTask = null;
      inTasks = false;
    }
  }
  if (currentTask && currentTask.id && currentTask.text !== void 0) {
    tasks.push({
      id: currentTask.id,
      text: currentTask.text,
      done: currentTask.done ?? false,
      priority: currentTask.priority ?? "medium",
      tags: currentTask.tags ?? []
    });
  }
  return { tasks, body };
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
    case "tags":
      const arrMatch = value.match(/^\[(.*)\]$/);
      if (arrMatch) {
        task.tags = arrMatch[1].split(",").map((t) => t.trim().replace(/^"(.*)"$/, "$1").replace(/\\"/g, '"')).filter(Boolean);
      }
      break;
  }
}
function serializeFrontmatter(tasks, body) {
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
  const yamlBlock = tasks.length > 0 ? `tasks:
${yamlTasks}` : "";
  return yamlBlock ? `---
${yamlBlock}
---
${body}` : `---
---
${body}`;
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
    const content = await this.vault.cachedRead(file);
    const parsed = parseFrontmatter(content);
    return {
      date,
      path,
      tasks: parsed?.tasks ?? [],
      body: parsed?.body ?? content
    };
  }
  async addTask(date, text, priority = "medium", deadline, reminder) {
    const task = {
      id: generateId(),
      text,
      done: false,
      priority,
      tags: []
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
      return serializeFrontmatter(tasks, parsed?.body ?? "");
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
      return serializeFrontmatter(tasks, parsed.body);
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
      return serializeFrontmatter(tasks, parsed.body);
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
      return serializeFrontmatter(parsed.tasks, newBody);
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
    const content = await vault.cachedRead(file);
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
    const content = await vault.cachedRead(file);
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
  const todayDate = new Date(today);
  const alerts = [];
  for (const file of files) {
    const content = await vault.cachedRead(file);
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
      const deadlineDate = new Date(task.deadline);
      const daysUntil = Math.floor(
        (deadlineDate.getTime() - todayDate.getTime()) / (1e3 * 60 * 60 * 24)
      );
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
    const content = await vault.cachedRead(file);
    const parsed = parseFrontmatter(content);
    if (!parsed)
      return;
    const date = file.name.replace(/\.md$/, "");
    const noteProjectTags = /* @__PURE__ */ new Set();
    for (const task of parsed.tasks) {
      for (const tag of task.tags) {
        if (isProjectTag(tag))
          noteProjectTags.add(tag);
      }
    }
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
    for (const projectTag of noteProjectTags) {
      const name = projectTag.replace("project/", "");
      if (!projectMap.has(name))
        projectMap.set(name, []);
      if (parsed.tasks.length > 0) {
        for (const task of parsed.tasks) {
          const existing = projectMap.get(name);
          if (!existing.some((e) => e.task.id === task.id)) {
            existing.push({ date, task, notePath: file.path });
          }
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
      const updated = ensureFrontmatter(serializeFrontmatter(tasks, body));
      const tagLine = `project/${name}`;
      if (!updated.includes(tagLine)) {
        return updated.replace(/^---\n/, `---
tags:
  - "${tagLine}"
`);
      }
      return updated;
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
  const minD = new Date(minDate);
  const maxD = new Date(maxDate);
  const rangeDays = Math.max(
    (maxD.getTime() - minD.getTime()) / (1e3 * 60 * 60 * 24) + 1,
    14
  );
  const paddedEnd = new Date(minD);
  paddedEnd.setDate(paddedEnd.getDate() + rangeDays);
  const endStr = paddedEnd.toISOString().slice(0, 10);
  const chart = container.createDiv("mc-gantt-chart");
  const headerRow = chart.createDiv("mc-gantt-header-row");
  headerRow.createDiv("mc-gantt-label-col").setText("Project");
  const timelineHeader = headerRow.createDiv("mc-gantt-timeline-col");
  const totalDays = rangeDays;
  const dayWidth = Math.max(24, Math.floor(600 / totalDays));
  const todayPos = Math.floor(
    (new Date(today).getTime() - minD.getTime()) / (1e3 * 60 * 60 * 24)
  );
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(minD);
    d.setDate(d.getDate() + i);
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
    const projStart = new Date(project.startDate);
    const projEnd = new Date(project.endDate);
    const startOffset = Math.max(
      0,
      Math.floor((projStart.getTime() - minD.getTime()) / (1e3 * 60 * 60 * 24))
    );
    const duration = Math.max(
      1,
      Math.ceil((projEnd.getTime() - projStart.getTime()) / (1e3 * 60 * 60 * 24)) + 1
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
      const dlDate = new Date(taskWithDeadline.task.deadline);
      const dlOffset = Math.floor(
        (dlDate.getTime() - minD.getTime()) / (1e3 * 60 * 60 * 24)
      );
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
    this.refresh();
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
    const d = new Date(dayData.date);
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
      const textEl = taskEl.createSpan({ text: task.text, cls: "mc-task-text" });
      if (task.deadline) {
        const dl = taskEl.createSpan({ text: `\u23F0 ${task.deadline}`, cls: "mc-task-deadline" });
      }
      if (task.reminder) {
        const reminderLabels = { "1day": "\u{1F514}1d", "3days": "\u{1F514}3d", "1week": "\u{1F514}1w" };
        taskEl.createSpan({ text: reminderLabels[task.reminder] || "", cls: "mc-task-reminder" });
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
      const rendered = dayData.body.replace(/\[\[([^\]]+)\]\]/g, '<a class="mc-wikilink" href="#">$1</a>').replace(/\n/g, "<br>");
      bodyContent.innerHTML = rendered;
      bodyContent.querySelectorAll(".mc-wikilink").forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const noteName = link.textContent || "";
          this.app.workspace.openLinkText(noteName, "", false);
        });
      });
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
      const dateSpan = cardHeader.createSpan({
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
        row.createSpan({ text: entry.date, cls: "mc-project-task-date" });
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
    const btnRow = form.createDiv("mc-form-btns");
    const submitBtn = btnRow.createEl("button", { text: "Create", cls: "mc-submit-btn" });
    submitBtn.addEventListener("click", async () => {
      if (nameInput.value.trim() && startInput.value && endInput.value) {
        try {
          const vault = this.app.vault;
          await createProject(vault, nameInput.value.trim(), startInput.value, endInput.value);
          form.remove();
          this.refresh();
        } catch (err) {
          new import_obsidian2.Notice(`Failed to create project: ${err}`);
        }
      }
    });
    const cancelBtn = btnRow.createEl("button", { text: "Cancel", cls: "mc-cancel-btn" });
    cancelBtn.addEventListener("click", () => form.remove());
    nameInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && nameInput.value.trim() && startInput.value && endInput.value) {
        try {
          const vault = this.app.vault;
          await createProject(vault, nameInput.value.trim(), startInput.value, endInput.value);
          form.remove();
          this.refresh();
        } catch (err) {
          new import_obsidian2.Notice(`Failed to create project: ${err}`);
        }
      }
    });
  }
  showAddTaskOverlay(container, date) {
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
    const deadlineRow = form.createDiv("mc-deadline-row");
    deadlineRow.createSpan({ text: "Deadline:", cls: "mc-date-label" });
    const deadlineInput = deadlineRow.createEl("input", {
      type: "date",
      cls: "mc-date-input"
    });
    deadlineRow.createSpan({ text: "Remind:", cls: "mc-date-label" });
    const reminderSelect = deadlineRow.createEl("select", { cls: "mc-priority-select" });
    reminderSelect.innerHTML = `
      <option value="">No reminder</option>
      <option value="1day">1 day before</option>
      <option value="3days">3 days before</option>
      <option value="1week">1 week before</option>
    `;
    const btnRow = form.createDiv("mc-form-btns");
    const submitBtn = btnRow.createEl("button", { text: "Add", cls: "mc-submit-btn" });
    submitBtn.addEventListener("click", async () => {
      if (input.value.trim()) {
        try {
          const deadline = deadlineInput.value || void 0;
          const reminder = reminderSelect.value || void 0;
          await this.taskManager.addTask(
            date,
            input.value.trim(),
            prioritySelect.value,
            deadline,
            reminder || void 0
          );
          this.refresh();
        } catch (err) {
          new import_obsidian2.Notice(`Failed to add task: ${err}`);
        }
      }
    });
    const cancelBtn = btnRow.createEl("button", { text: "Cancel", cls: "mc-cancel-btn" });
    cancelBtn.addEventListener("click", () => {
      form.remove();
    });
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && input.value.trim()) {
        try {
          const deadline = deadlineInput.value || void 0;
          const reminder = reminderSelect.value || void 0;
          await this.taskManager.addTask(
            date,
            input.value.trim(),
            prioritySelect.value,
            deadline,
            reminder || void 0
          );
          this.refresh();
        } catch (err) {
          new import_obsidian2.Notice(`Failed to add task: ${err}`);
        }
      }
    });
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL0NhbGVuZGFyVmlldy50cyIsICJzcmMvdHlwZXMudHMiLCAic3JjL3NjYW5uZXIudHMiLCAic3JjL3BhcnNlci50cyIsICJzcmMvdGFza01hbmFnZXIudHMiLCAic3JjL3JlbWluZGVyLnRzIiwgInNyYy9wcm9qZWN0TWFuYWdlci50cyIsICJzcmMvR2FudHRDaGFydC50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgUGx1Z2luLCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgQ2FsZW5kYXJWaWV3LCBWSUVXX1RZUEVfQ0FMRU5EQVIgfSBmcm9tICcuL0NhbGVuZGFyVmlldyc7XG5pbXBvcnQgeyBlbnN1cmVEaWFyeUZvbGRlciB9IGZyb20gJy4vc2Nhbm5lcic7XG5pbXBvcnQgeyByZW5kZXJHYW50dENoYXJ0LCBwYXJzZUdhbnR0QmxvY2sgfSBmcm9tICcuL0dhbnR0Q2hhcnQnO1xuaW1wb3J0IHsgY2hlY2tSZW1pbmRlcnMsIGZpcmVSZW1pbmRlck5vdGlmaWNhdGlvbiwgcmVxdWVzdE5vdGlmaWNhdGlvblBlcm1pc3Npb24sIHJlc2V0UmVtaW5kZXJzIH0gZnJvbSAnLi9yZW1pbmRlcic7XG5cbmNvbnN0IFJFTUlOREVSX0lOVEVSVkFMX01TID0gNSAqIDYwICogMTAwMDsgLy8gY2hlY2sgZXZlcnkgNSBtaW51dGVzXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1lbW9DYWxlbmRhclBsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHByaXZhdGUgcmVtaW5kZXJJbnRlcnZhbDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG5cbiAgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IGVuc3VyZURpYXJ5Rm9sZGVyKHRoaXMuYXBwLnZhdWx0KTtcblxuICAgIHRoaXMucmVnaXN0ZXJWaWV3KFxuICAgICAgVklFV19UWVBFX0NBTEVOREFSLFxuICAgICAgKGxlYWY6IFdvcmtzcGFjZUxlYWYpID0+IG5ldyBDYWxlbmRhclZpZXcobGVhZiwgdGhpcy5hcHAudmF1bHQpXG4gICAgKTtcblxuICAgIHRoaXMuYWRkUmliYm9uSWNvbignY2FsZW5kYXItZGF5cycsICdPcGVuIE1lbW8gQ2FsZW5kYXInLCAoKSA9PiB7XG4gICAgICB0aGlzLmFjdGl2YXRlVmlldygpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnb3Blbi1tZW1vLWNhbGVuZGFyJyxcbiAgICAgIG5hbWU6ICdPcGVuIE1lbW8gQ2FsZW5kYXInLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuYWN0aXZhdGVWaWV3KCksXG4gICAgfSk7XG5cbiAgICAvLyBSZWdpc3RlciBjb2RlIGJsb2NrIHByb2Nlc3NvciBmb3IgbWVtby1nYW50dFxuICAgIHRoaXMucmVnaXN0ZXJNYXJrZG93bkNvZGVCbG9ja1Byb2Nlc3NvcignbWVtby1nYW50dCcsIGFzeW5jIChzb3VyY2UsIGVsKSA9PiB7XG4gICAgICBjb25zdCBwYXJhbXMgPSBwYXJzZUdhbnR0QmxvY2soc291cmNlKTtcbiAgICAgIGF3YWl0IHJlbmRlckdhbnR0Q2hhcnQoZWwsIHRoaXMuYXBwLnZhdWx0LCBwYXJhbXMucHJvamVjdCk7XG4gICAgfSk7XG5cbiAgICAvLyBSZXF1ZXN0IHN5c3RlbSBub3RpZmljYXRpb24gcGVybWlzc2lvblxuICAgIHJlcXVlc3ROb3RpZmljYXRpb25QZXJtaXNzaW9uKCk7XG5cbiAgICAvLyBTdGFydCByZW1pbmRlciBjaGVja2VyXG4gICAgdGhpcy5zdGFydFJlbWluZGVyQ2hlY2soKTtcbiAgfVxuXG4gIGFzeW5jIG9udW5sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc3RvcFJlbWluZGVyQ2hlY2soKTtcbiAgICByZXNldFJlbWluZGVycygpO1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5kZXRhY2hMZWF2ZXNPZlR5cGUoVklFV19UWVBFX0NBTEVOREFSKTtcbiAgfVxuXG4gIGFzeW5jIGFjdGl2YXRlVmlldygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHA7XG5cbiAgICBjb25zdCBleGlzdGluZyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVklFV19UWVBFX0NBTEVOREFSKTtcbiAgICBpZiAoZXhpc3RpbmcubGVuZ3RoID4gMCkge1xuICAgICAgd29ya3NwYWNlLnJldmVhbExlYWYoZXhpc3RpbmdbMF0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGxlYWYgPSB3b3Jrc3BhY2UuZ2V0TGVhZih0cnVlKTtcbiAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IFZJRVdfVFlQRV9DQUxFTkRBUiwgYWN0aXZlOiB0cnVlIH0pO1xuICAgIHdvcmtzcGFjZS5yZXZlYWxMZWFmKGxlYWYpO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGFydFJlbWluZGVyQ2hlY2soKTogdm9pZCB7XG4gICAgLy8gUnVuIGltbWVkaWF0ZWx5IG9uIHN0YXJ0dXBcbiAgICB0aGlzLnJ1blJlbWluZGVyQ2hlY2soKTtcbiAgICAvLyBUaGVuIHBvbGwgYXQgaW50ZXJ2YWxcbiAgICB0aGlzLnJlbWluZGVySW50ZXJ2YWwgPSB3aW5kb3cuc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgdGhpcy5ydW5SZW1pbmRlckNoZWNrKCk7XG4gICAgfSwgUkVNSU5ERVJfSU5URVJWQUxfTVMpO1xuICAgIHRoaXMucmVnaXN0ZXJJbnRlcnZhbCh0aGlzLnJlbWluZGVySW50ZXJ2YWwpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBydW5SZW1pbmRlckNoZWNrKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBhbGVydHMgPSBhd2FpdCBjaGVja1JlbWluZGVycyh0aGlzLmFwcC52YXVsdCk7XG4gICAgICBmb3IgKGNvbnN0IGFsZXJ0IG9mIGFsZXJ0cykge1xuICAgICAgICBmaXJlUmVtaW5kZXJOb3RpZmljYXRpb24oYWxlcnQpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKF9lKSB7XG4gICAgICAvLyBTaWxlbnRseSBpZ25vcmUgcmVtaW5kZXIgY2hlY2sgZmFpbHVyZXNcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHN0b3BSZW1pbmRlckNoZWNrKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnJlbWluZGVySW50ZXJ2YWwgIT09IG51bGwpIHtcbiAgICAgIHdpbmRvdy5jbGVhckludGVydmFsKHRoaXMucmVtaW5kZXJJbnRlcnZhbCk7XG4gICAgICB0aGlzLnJlbWluZGVySW50ZXJ2YWwgPSBudWxsO1xuICAgIH1cbiAgfVxufVxuIiwgImltcG9ydCB7IEl0ZW1WaWV3LCBXb3Jrc3BhY2VMZWFmLCBWYXVsdCwgTm90aWNlIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgVklFV19UWVBFX0NBTEVOREFSLCBDYWxlbmRhclN0YXRlLCBQUklPUklUWV9DT0xPUlMsIHRvZGF5U3RyLCBUYXNrLCBWaWV3TW9kZSwgUHJvamVjdCwgUmVtaW5kZXJPZmZzZXQgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IFRhc2tNYW5hZ2VyIH0gZnJvbSAnLi90YXNrTWFuYWdlcic7XG5pbXBvcnQgeyBkaWFyeVBhdGggfSBmcm9tICcuL3NjYW5uZXInO1xuaW1wb3J0IHsgZ2V0T3ZlcmR1ZVRhc2tzLCBkYWlseVRhc2tDb3VudHMsIE92ZXJkdWVUYXNrIH0gZnJvbSAnLi9yZW1pbmRlcic7XG5pbXBvcnQgeyBnZXRQcm9qZWN0cywgY3JlYXRlUHJvamVjdCB9IGZyb20gJy4vcHJvamVjdE1hbmFnZXInO1xuaW1wb3J0IHsgcmVuZGVyR2FudHRDaGFydCB9IGZyb20gJy4vR2FudHRDaGFydCc7XG5cbmV4cG9ydCB7IFZJRVdfVFlQRV9DQUxFTkRBUiB9O1xuXG5leHBvcnQgY2xhc3MgQ2FsZW5kYXJWaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xuICBwcml2YXRlIHN0YXRlOiBDYWxlbmRhclN0YXRlO1xuICBwcml2YXRlIHRhc2tNYW5hZ2VyOiBUYXNrTWFuYWdlcjtcbiAgcHJpdmF0ZSBvdmVyZHVlVGFza3M6IE92ZXJkdWVUYXNrW10gPSBbXTtcbiAgcHJpdmF0ZSB2aWV3TW9kZTogVmlld01vZGU7XG5cbiAgY29uc3RydWN0b3IobGVhZjogV29ya3NwYWNlTGVhZiwgdmF1bHQ6IFZhdWx0KSB7XG4gICAgc3VwZXIobGVhZik7XG4gICAgdGhpcy50YXNrTWFuYWdlciA9IG5ldyBUYXNrTWFuYWdlcih2YXVsdCk7XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgY3VycmVudFllYXI6IG5vdy5nZXRGdWxsWWVhcigpLFxuICAgICAgY3VycmVudE1vbnRoOiBub3cuZ2V0TW9udGgoKSxcbiAgICAgIHNlbGVjdGVkRGF0ZTogdG9kYXlTdHIoKSxcbiAgICB9O1xuICAgIHRoaXMudmlld01vZGUgPSAnY2FsZW5kYXInO1xuICB9XG5cbiAgZ2V0Vmlld1R5cGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gVklFV19UWVBFX0NBTEVOREFSO1xuICB9XG5cbiAgZ2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ01lbW8gQ2FsZW5kYXInO1xuICB9XG5cbiAgZ2V0SWNvbigpOiBzdHJpbmcge1xuICAgIHJldHVybiAnY2FsZW5kYXItZGF5cyc7XG4gIH1cblxuICBhc3luYyBvbk9wZW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5yZWZyZXNoKCk7XG4gIH1cblxuICBhc3luYyByZWZyZXNoKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuY29udGVudEVsO1xuICAgIGNvbnRhaW5lci5lbXB0eSgpO1xuXG4gICAgY29uc3QgdmF1bHQgPSAodGhpcy5hcHAgYXMgYW55KS52YXVsdCBhcyBWYXVsdDtcbiAgICB0aGlzLm92ZXJkdWVUYXNrcyA9IGF3YWl0IGdldE92ZXJkdWVUYXNrcyh2YXVsdCk7XG5cbiAgICBjb25zdCB3cmFwcGVyID0gY29udGFpbmVyLmNyZWF0ZURpdignbWMtd3JhcHBlcicpO1xuXG4gICAgdGhpcy5yZW5kZXJIZWFkZXIod3JhcHBlcik7XG5cbiAgICBpZiAodGhpcy52aWV3TW9kZSA9PT0gJ2NhbGVuZGFyJykge1xuICAgICAgY29uc3QgYm9keSA9IHdyYXBwZXIuY3JlYXRlRGl2KCdtYy1ib2R5Jyk7XG4gICAgICBjb25zdCBsZWZ0UGFuZWwgPSBib2R5LmNyZWF0ZURpdignbWMtbGVmdC1wYW5lbCcpO1xuICAgICAgYXdhaXQgdGhpcy5yZW5kZXJDYWxlbmRhckdyaWQobGVmdFBhbmVsKTtcbiAgICAgIGNvbnN0IHJpZ2h0UGFuZWwgPSBib2R5LmNyZWF0ZURpdignbWMtcmlnaHQtcGFuZWwnKTtcbiAgICAgIGF3YWl0IHRoaXMucmVuZGVyRGF5RGV0YWlsKHJpZ2h0UGFuZWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCB0aGlzLnJlbmRlclByb2plY3RzVmlldyh3cmFwcGVyKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnJlbmRlclJlbWluZGVyQmFubmVyKHdyYXBwZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJIZWFkZXIoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IGhlYWRlciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoJ21jLWhlYWRlcicpO1xuICAgIGNvbnN0IHByZXYgPSBoZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ1x1MjVDMCcsIGNsczogJ21jLW5hdi1idG4nIH0pO1xuICAgIGNvbnN0IHRpdGxlID0gaGVhZGVyLmNyZWF0ZURpdignbWMtdGl0bGUnKTtcbiAgICB0aGlzLnVwZGF0ZVRpdGxlKHRpdGxlKTtcbiAgICBjb25zdCBuZXh0ID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICdcdTI1QjYnLCBjbHM6ICdtYy1uYXYtYnRuJyB9KTtcblxuICAgIHByZXYuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICBpZiAodGhpcy5zdGF0ZS5jdXJyZW50TW9udGggPT09IDApIHtcbiAgICAgICAgdGhpcy5zdGF0ZS5jdXJyZW50TW9udGggPSAxMTtcbiAgICAgICAgdGhpcy5zdGF0ZS5jdXJyZW50WWVhci0tO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zdGF0ZS5jdXJyZW50TW9udGgtLTtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgIH0pO1xuXG4gICAgbmV4dC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIGlmICh0aGlzLnN0YXRlLmN1cnJlbnRNb250aCA9PT0gMTEpIHtcbiAgICAgICAgdGhpcy5zdGF0ZS5jdXJyZW50TW9udGggPSAwO1xuICAgICAgICB0aGlzLnN0YXRlLmN1cnJlbnRZZWFyKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnN0YXRlLmN1cnJlbnRNb250aCsrO1xuICAgICAgfVxuICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgfSk7XG5cbiAgICBjb25zdCB0b2RheUJ0biA9IGhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnVG9kYXknLCBjbHM6ICdtYy10b2RheS1idG4nIH0pO1xuICAgIHRvZGF5QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgIHRoaXMuc3RhdGUuY3VycmVudFllYXIgPSBub3cuZ2V0RnVsbFllYXIoKTtcbiAgICAgIHRoaXMuc3RhdGUuY3VycmVudE1vbnRoID0gbm93LmdldE1vbnRoKCk7XG4gICAgICB0aGlzLnN0YXRlLnNlbGVjdGVkRGF0ZSA9IHRvZGF5U3RyKCk7XG4gICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICB9KTtcblxuICAgIC8vIFZpZXcgbW9kZSB0b2dnbGVcbiAgICBjb25zdCB0b2dnbGVDb250YWluZXIgPSBoZWFkZXIuY3JlYXRlRGl2KCdtYy12aWV3LXRvZ2dsZScpO1xuICAgIGNvbnN0IGNhbEJ0biA9IHRvZ2dsZUNvbnRhaW5lci5jcmVhdGVFbCgnYnV0dG9uJywge1xuICAgICAgdGV4dDogJ0NhbGVuZGFyJyxcbiAgICAgIGNsczogdGhpcy52aWV3TW9kZSA9PT0gJ2NhbGVuZGFyJyA/ICdtYy10b2dnbGUtYnRuIG1jLXRvZ2dsZS1hY3RpdmUnIDogJ21jLXRvZ2dsZS1idG4nLFxuICAgIH0pO1xuICAgIGNvbnN0IHByb2pCdG4gPSB0b2dnbGVDb250YWluZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHtcbiAgICAgIHRleHQ6ICdQcm9qZWN0cycsXG4gICAgICBjbHM6IHRoaXMudmlld01vZGUgPT09ICdwcm9qZWN0cycgPyAnbWMtdG9nZ2xlLWJ0biBtYy10b2dnbGUtYWN0aXZlJyA6ICdtYy10b2dnbGUtYnRuJyxcbiAgICB9KTtcblxuICAgIGNhbEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHRoaXMudmlld01vZGUgPSAnY2FsZW5kYXInO1xuICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgfSk7XG4gICAgcHJvakJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHRoaXMudmlld01vZGUgPSAncHJvamVjdHMnO1xuICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZVRpdGxlKGVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IG1vbnRocyA9IFsnSmFudWFyeScsJ0ZlYnJ1YXJ5JywnTWFyY2gnLCdBcHJpbCcsJ01heScsJ0p1bmUnLFxuICAgICAgICAgICAgICAgICAgICAnSnVseScsJ0F1Z3VzdCcsJ1NlcHRlbWJlcicsJ09jdG9iZXInLCdOb3ZlbWJlcicsJ0RlY2VtYmVyJ107XG4gICAgZWwuc2V0VGV4dChgJHttb250aHNbdGhpcy5zdGF0ZS5jdXJyZW50TW9udGhdfSAke3RoaXMuc3RhdGUuY3VycmVudFllYXJ9YCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlbmRlckNhbGVuZGFyR3JpZChjb250YWluZXI6IEhUTUxFbGVtZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZ3JpZCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoJ21jLWNhbGVuZGFyLWdyaWQnKTtcblxuICAgIGNvbnN0IGRheU5hbWVzID0gWydNb24nLCAnVHVlJywgJ1dlZCcsICdUaHUnLCAnRnJpJywgJ1NhdCcsICdTdW4nXTtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgZGF5TmFtZXMpIHtcbiAgICAgIGdyaWQuY3JlYXRlRGl2KCdtYy1kYXktaGVhZGVyJykuc2V0VGV4dChuYW1lKTtcbiAgICB9XG5cbiAgICBjb25zdCB5ZWFyID0gdGhpcy5zdGF0ZS5jdXJyZW50WWVhcjtcbiAgICBjb25zdCBtb250aCA9IHRoaXMuc3RhdGUuY3VycmVudE1vbnRoO1xuICAgIGNvbnN0IGZpcnN0RGF5ID0gbmV3IERhdGUoeWVhciwgbW9udGgsIDEpLmdldERheSgpO1xuICAgIGNvbnN0IGRheXNJbk1vbnRoID0gbmV3IERhdGUoeWVhciwgbW9udGggKyAxLCAwKS5nZXREYXRlKCk7XG4gICAgY29uc3QgcHJldk1vbnRoRGF5cyA9IG5ldyBEYXRlKHllYXIsIG1vbnRoLCAwKS5nZXREYXRlKCk7XG5cbiAgICBjb25zdCB0YXNrQ291bnRzID0gYXdhaXQgZGFpbHlUYXNrQ291bnRzKCh0aGlzLmFwcCBhcyBhbnkpLnZhdWx0IGFzIFZhdWx0LCB5ZWFyLCBtb250aCk7XG4gICAgY29uc3Qgb3ZlcmR1ZURhdGVzID0gbmV3IFNldChcbiAgICAgIHRoaXMub3ZlcmR1ZVRhc2tzLmZpbHRlcih0ID0+IHQuZGF0ZS5zdGFydHNXaXRoKFxuICAgICAgICBgJHt5ZWFyfS0ke1N0cmluZyhtb250aCArIDEpLnBhZFN0YXJ0KDIsICcwJyl9YFxuICAgICAgKSkubWFwKHQgPT4gdC5kYXRlLnNsaWNlKDgpKVxuICAgICk7XG5cbiAgICBjb25zdCB0b2RheSA9IHRvZGF5U3RyKCk7XG5cbiAgICBjb25zdCBzdGFydE9mZnNldCA9IGZpcnN0RGF5ID09PSAwID8gNiA6IGZpcnN0RGF5IC0gMTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RhcnRPZmZzZXQ7IGkrKykge1xuICAgICAgY29uc3QgZGF5ID0gcHJldk1vbnRoRGF5cyAtIHN0YXJ0T2Zmc2V0ICsgaSArIDE7XG4gICAgICBjb25zdCBjZWxsID0gZ3JpZC5jcmVhdGVEaXYoJ21jLWRheS1jZWxsIG1jLWRheS1vdGhlcicpO1xuICAgICAgY2VsbC5jcmVhdGVEaXYoJ21jLWRheS1udW0nKS5zZXRUZXh0KFN0cmluZyhkYXkpKTtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBkYXkgPSAxOyBkYXkgPD0gZGF5c0luTW9udGg7IGRheSsrKSB7XG4gICAgICBjb25zdCBkYXRlU3RyID0gYCR7eWVhcn0tJHtTdHJpbmcobW9udGggKyAxKS5wYWRTdGFydCgyLCAnMCcpfS0ke1N0cmluZyhkYXkpLnBhZFN0YXJ0KDIsICcwJyl9YDtcbiAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBkYXRlU3RyID09PSB0aGlzLnN0YXRlLnNlbGVjdGVkRGF0ZTtcbiAgICAgIGNvbnN0IGlzVG9kYXkgPSBkYXRlU3RyID09PSB0b2RheTtcblxuICAgICAgY29uc3QgY2VsbCA9IGdyaWQuY3JlYXRlRGl2KCdtYy1kYXktY2VsbCcpO1xuICAgICAgaWYgKGlzU2VsZWN0ZWQpIGNlbGwuYWRkQ2xhc3MoJ21jLWRheS1zZWxlY3RlZCcpO1xuICAgICAgaWYgKGlzVG9kYXkpIGNlbGwuYWRkQ2xhc3MoJ21jLWRheS10b2RheScpO1xuXG4gICAgICBjb25zdCBudW1FbCA9IGNlbGwuY3JlYXRlRGl2KCdtYy1kYXktbnVtJyk7XG4gICAgICBudW1FbC5zZXRUZXh0KFN0cmluZyhkYXkpKTtcblxuICAgICAgY29uc3QgY291bnQgPSB0YXNrQ291bnRzLmdldChkYXkpO1xuICAgICAgaWYgKGNvdW50ICYmIGNvdW50ID4gMCkge1xuICAgICAgICBjb25zdCBkb3RzID0gY2VsbC5jcmVhdGVEaXYoJ21jLWRheS1kb3RzJyk7XG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgTWF0aC5taW4oY291bnQsIDMpOyBqKyspIHtcbiAgICAgICAgICBkb3RzLmNyZWF0ZURpdignbWMtZG90Jyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvdW50ID4gMykge1xuICAgICAgICAgIGRvdHMuY3JlYXRlU3Bhbih7IGNsczogJ21jLWRvdC1tb3JlJywgdGV4dDogYCske2NvdW50IC0gM31gIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChvdmVyZHVlRGF0ZXMuaGFzKFN0cmluZyhkYXkpKSkge1xuICAgICAgICBjZWxsLmNyZWF0ZURpdignbWMtb3ZlcmR1ZS1kb3QnKTtcbiAgICAgIH1cblxuICAgICAgY2VsbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgdGhpcy5zdGF0ZS5zZWxlY3RlZERhdGUgPSBkYXRlU3RyO1xuICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgIH0pO1xuXG4gICAgICBjZWxsLnNldEF0dHIoJ3RhYmluZGV4JywgJzAnKTtcbiAgICAgIGNlbGwuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIChlKSA9PiB7XG4gICAgICAgIGlmIChlLmtleSA9PT0gJ0VudGVyJykge1xuICAgICAgICAgIHRoaXMuc3RhdGUuc2VsZWN0ZWREYXRlID0gZGF0ZVN0cjtcbiAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgdG90YWxDZWxscyA9IHN0YXJ0T2Zmc2V0ICsgZGF5c0luTW9udGg7XG4gICAgY29uc3QgcmVtYWluaW5nQ2VsbHMgPSB0b3RhbENlbGxzICUgNyA9PT0gMCA/IDAgOiA3IC0gKHRvdGFsQ2VsbHMgJSA3KTtcbiAgICBmb3IgKGxldCBkYXkgPSAxOyBkYXkgPD0gcmVtYWluaW5nQ2VsbHM7IGRheSsrKSB7XG4gICAgICBjb25zdCBjZWxsID0gZ3JpZC5jcmVhdGVEaXYoJ21jLWRheS1jZWxsIG1jLWRheS1vdGhlcicpO1xuICAgICAgY2VsbC5jcmVhdGVEaXYoJ21jLWRheS1udW0nKS5zZXRUZXh0KFN0cmluZyhkYXkpKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlbmRlckRheURldGFpbChjb250YWluZXI6IEhUTUxFbGVtZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdmF1bHQgPSAodGhpcy5hcHAgYXMgYW55KS52YXVsdCBhcyBWYXVsdDtcbiAgICBjb25zdCBkYXRlID0gdGhpcy5zdGF0ZS5zZWxlY3RlZERhdGUgfHwgdG9kYXlTdHIoKTtcbiAgICBjb25zdCBkYXlEYXRhID0gYXdhaXQgdGhpcy50YXNrTWFuYWdlci5nZXREYXkoZGF0ZSk7XG5cbiAgICBjb250YWluZXIuZW1wdHkoKTtcblxuICAgIGNvbnN0IGRhdGVIZWFkZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KCdtYy1kYXRlLWhlYWRlcicpO1xuICAgIGNvbnN0IGQgPSBuZXcgRGF0ZShkYXlEYXRhLmRhdGUpO1xuICAgIGNvbnN0IHdlZWtkYXlzID0gWydTdW5kYXknLCdNb25kYXknLCdUdWVzZGF5JywnV2VkbmVzZGF5JywnVGh1cnNkYXknLCdGcmlkYXknLCdTYXR1cmRheSddO1xuICAgIGNvbnN0IG1vbnRocyA9IFsnSmFudWFyeScsJ0ZlYnJ1YXJ5JywnTWFyY2gnLCdBcHJpbCcsJ01heScsJ0p1bmUnLFxuICAgICAgICAgICAgICAgICAgICAnSnVseScsJ0F1Z3VzdCcsJ1NlcHRlbWJlcicsJ09jdG9iZXInLCdOb3ZlbWJlcicsJ0RlY2VtYmVyJ107XG4gICAgZGF0ZUhlYWRlci5jcmVhdGVEaXYoJ21jLWRhdGUtdGl0bGUnKS5zZXRUZXh0KGAke21vbnRoc1tkLmdldE1vbnRoKCldfSAke2QuZ2V0RGF0ZSgpfSwgJHtkLmdldEZ1bGxZZWFyKCl9YCk7XG4gICAgZGF0ZUhlYWRlci5jcmVhdGVEaXYoJ21jLWRhdGUtd2Vla2RheScpLnNldFRleHQod2Vla2RheXNbZC5nZXREYXkoKV0pO1xuXG4gICAgY29uc3QgdGFza1NlY3Rpb24gPSBjb250YWluZXIuY3JlYXRlRGl2KCdtYy10YXNrLXNlY3Rpb24nKTtcbiAgICBjb25zdCB0YXNrSGVhZGVyID0gdGFza1NlY3Rpb24uY3JlYXRlRGl2KCdtYy1zZWN0aW9uLWhlYWRlcicpO1xuICAgIHRhc2tIZWFkZXIuY3JlYXRlU3Bhbih7IHRleHQ6ICdUYXNrcycsIGNsczogJ21jLXNlY3Rpb24tbGFiZWwnIH0pO1xuXG4gICAgY29uc3QgYWRkQnRuID0gdGFza0hlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnKycsIGNsczogJ21jLWFkZC1idG4nIH0pO1xuICAgIGFkZEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHRoaXMuc2hvd0FkZFRhc2tPdmVybGF5KHRhc2tTZWN0aW9uLCBkYXRlKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IHRhc2tMaXN0ID0gdGFza1NlY3Rpb24uY3JlYXRlRGl2KCdtYy10YXNrLWxpc3QnKTtcblxuICAgIGlmIChkYXlEYXRhLnRhc2tzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGFza0xpc3QuY3JlYXRlRGl2KCdtYy1lbXB0eS1zdGF0ZScpLnNldFRleHQoJ05vIHRhc2tzIGZvciB0aGlzIGRheS4gQ2xpY2sgKyB0byBhZGQuJyk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCB0YXNrIG9mIGRheURhdGEudGFza3MpIHtcbiAgICAgIGNvbnN0IHRhc2tFbCA9IHRhc2tMaXN0LmNyZWF0ZURpdignbWMtdGFzay1pdGVtJyk7XG4gICAgICBpZiAodGFzay5kb25lKSB0YXNrRWwuYWRkQ2xhc3MoJ21jLXRhc2stZG9uZScpO1xuXG4gICAgICBjb25zdCBjaGVja2JveCA9IHRhc2tFbC5jcmVhdGVEaXYoJ21jLWNoZWNrYm94Jyk7XG4gICAgICBpZiAodGFzay5kb25lKSBjaGVja2JveC5hZGRDbGFzcygnbWMtY2hlY2tib3gtY2hlY2tlZCcpO1xuICAgICAgY2hlY2tib3guYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBhc3luYyAoZSkgPT4ge1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBjb25zdCBuZXdEb25lID0gIXRhc2suZG9uZTtcbiAgICAgICAgdGFzay5kb25lID0gbmV3RG9uZTtcbiAgICAgICAgaWYgKG5ld0RvbmUpIHtcbiAgICAgICAgICBjaGVja2JveC5hZGRDbGFzcygnbWMtY2hlY2tib3gtY2hlY2tlZCcpO1xuICAgICAgICAgIHRhc2tFbC5hZGRDbGFzcygnbWMtdGFzay1kb25lJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2hlY2tib3gucmVtb3ZlQ2xhc3MoJ21jLWNoZWNrYm94LWNoZWNrZWQnKTtcbiAgICAgICAgICB0YXNrRWwucmVtb3ZlQ2xhc3MoJ21jLXRhc2stZG9uZScpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMudGFza01hbmFnZXIudXBkYXRlVGFzayhkYXRlLCB0YXNrLmlkLCB7IGRvbmU6IG5ld0RvbmUgfSk7XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcHJpb3JpdHlEb3QgPSB0YXNrRWwuY3JlYXRlRGl2KCdtYy1wcmlvcml0eS1kb3QnKTtcbiAgICAgIHByaW9yaXR5RG90LnN0eWxlLmJhY2tncm91bmRDb2xvciA9IFBSSU9SSVRZX0NPTE9SU1t0YXNrLnByaW9yaXR5XTtcblxuICAgICAgY29uc3QgdGV4dEVsID0gdGFza0VsLmNyZWF0ZVNwYW4oeyB0ZXh0OiB0YXNrLnRleHQsIGNsczogJ21jLXRhc2stdGV4dCcgfSk7XG5cbiAgICAgIGlmICh0YXNrLmRlYWRsaW5lKSB7XG4gICAgICAgIGNvbnN0IGRsID0gdGFza0VsLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgXHUyM0YwICR7dGFzay5kZWFkbGluZX1gLCBjbHM6ICdtYy10YXNrLWRlYWRsaW5lJyB9KTtcbiAgICAgIH1cbiAgICAgIGlmICh0YXNrLnJlbWluZGVyKSB7XG4gICAgICAgIGNvbnN0IHJlbWluZGVyTGFiZWxzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyAnMWRheSc6ICdcdUQ4M0RcdUREMTQxZCcsICczZGF5cyc6ICdcdUQ4M0RcdUREMTQzZCcsICcxd2Vlayc6ICdcdUQ4M0RcdUREMTQxdycgfTtcbiAgICAgICAgdGFza0VsLmNyZWF0ZVNwYW4oeyB0ZXh0OiByZW1pbmRlckxhYmVsc1t0YXNrLnJlbWluZGVyXSB8fCAnJywgY2xzOiAnbWMtdGFzay1yZW1pbmRlcicgfSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRlbGV0ZUJ0biA9IHRhc2tFbC5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnXHUwMEQ3JywgY2xzOiAnbWMtZGVsZXRlLWJ0bicgfSk7XG4gICAgICBkZWxldGVCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGF3YWl0IHRoaXMudGFza01hbmFnZXIuZGVsZXRlVGFzayhkYXRlLCB0YXNrLmlkKTtcbiAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb250YWluZXIuY3JlYXRlRGl2KCdtYy1kaXZpZGVyJyk7XG5cbiAgICBjb25zdCBib2R5U2VjdGlvbiA9IGNvbnRhaW5lci5jcmVhdGVEaXYoJ21jLWJvZHktc2VjdGlvbicpO1xuICAgIGNvbnN0IGJvZHlIZWFkZXIgPSBib2R5U2VjdGlvbi5jcmVhdGVEaXYoJ21jLXNlY3Rpb24taGVhZGVyJyk7XG4gICAgYm9keUhlYWRlci5jcmVhdGVTcGFuKHsgdGV4dDogJ1dvcmsgTG9nJywgY2xzOiAnbWMtc2VjdGlvbi1sYWJlbCcgfSk7XG5cbiAgICBjb25zdCBuZXdQcm9qQnRuID0gYm9keUhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnK1Byb2plY3QnLCBjbHM6ICdtYy1wcm9qLWJ0bicgfSk7XG4gICAgbmV3UHJvakJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHRoaXMuc2hvd0FkZFByb2plY3RPdmVybGF5KGJvZHlTZWN0aW9uLCBkYXRlKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IG9wZW5CdG4gPSBib2R5SGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICdFZGl0JywgY2xzOiAnbWMtZWRpdC1idG4nIH0pO1xuICAgIG9wZW5CdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICBjb25zdCBwYXRoID0gZGlhcnlQYXRoKGRhdGUpO1xuICAgICAgY29uc3QgZmlsZSA9IHZhdWx0LmdldEZpbGVCeVBhdGgocGF0aCk7XG4gICAgICBpZiAoZmlsZSkge1xuICAgICAgICAodGhpcy5hcHAgYXMgYW55KS53b3Jrc3BhY2UuZ2V0TGVhZigpLm9wZW5GaWxlKGZpbGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgKHRoaXMuYXBwIGFzIGFueSkud29ya3NwYWNlLm9wZW5MaW5rVGV4dChkYXRlLCAnXHU2NUU1XHU4QkIwLycsIHRydWUpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKGRheURhdGEuYm9keS50cmltKCkpIHtcbiAgICAgIGNvbnN0IGJvZHlDb250ZW50ID0gYm9keVNlY3Rpb24uY3JlYXRlRGl2KCdtYy1ib2R5LWNvbnRlbnQnKTtcbiAgICAgIGNvbnN0IHJlbmRlcmVkID0gZGF5RGF0YS5ib2R5XG4gICAgICAgIC5yZXBsYWNlKC9cXFtcXFsoW15cXF1dKylcXF1cXF0vZywgJzxhIGNsYXNzPVwibWMtd2lraWxpbmtcIiBocmVmPVwiI1wiPiQxPC9hPicpXG4gICAgICAgIC5yZXBsYWNlKC9cXG4vZywgJzxicj4nKTtcbiAgICAgIGJvZHlDb250ZW50LmlubmVySFRNTCA9IHJlbmRlcmVkO1xuXG4gICAgICBib2R5Q29udGVudC5xdWVyeVNlbGVjdG9yQWxsKCcubWMtd2lraWxpbmsnKS5mb3JFYWNoKGxpbmsgPT4ge1xuICAgICAgICBsaW5rLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgY29uc3Qgbm90ZU5hbWUgPSAobGluayBhcyBIVE1MRWxlbWVudCkudGV4dENvbnRlbnQgfHwgJyc7XG4gICAgICAgICAgKHRoaXMuYXBwIGFzIGFueSkud29ya3NwYWNlLm9wZW5MaW5rVGV4dChub3RlTmFtZSwgJycsIGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYm9keVNlY3Rpb24uY3JlYXRlRGl2KCdtYy1lbXB0eS1zdGF0ZScpLnNldFRleHQoJ05vIHdvcmsgbG9nIHlldC4gT3BlbiB0aGlzIGZpbGUgaW4gT2JzaWRpYW4gdG8gd3JpdGUuJyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZW5kZXJQcm9qZWN0c1ZpZXcoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHZhdWx0ID0gKHRoaXMuYXBwIGFzIGFueSkudmF1bHQgYXMgVmF1bHQ7XG4gICAgY29uc3QgcHJvamVjdHMgPSBhd2FpdCBnZXRQcm9qZWN0cyh2YXVsdCk7XG5cbiAgICBjb25zdCBib2R5ID0gY29udGFpbmVyLmNyZWF0ZURpdignbWMtcHJvamVjdHMtYm9keScpO1xuXG4gICAgY29uc3QgaGVhZGVyID0gYm9keS5jcmVhdGVEaXYoJ21jLXNlY3Rpb24taGVhZGVyJyk7XG4gICAgaGVhZGVyLmNyZWF0ZVNwYW4oeyB0ZXh0OiAnQWN0aXZlIFByb2plY3RzJywgY2xzOiAnbWMtc2VjdGlvbi1sYWJlbCcgfSk7XG5cbiAgICBjb25zdCBhZGRQcm9qQnRuID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICcrIE5ldycsIGNsczogJ21jLWFkZC1idG4nIH0pO1xuICAgIGFkZFByb2pCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLnNob3dBZGRQcm9qZWN0T3ZlcmxheShib2R5LCB0b2RheVN0cigpKTtcbiAgICB9KTtcblxuICAgIGlmIChwcm9qZWN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgIGJvZHkuY3JlYXRlRGl2KCdtYy1lbXB0eS1zdGF0ZScpLnNldFRleHQoXG4gICAgICAgICdObyBwcm9qZWN0cyB5ZXQuIEFkZCAjcHJvamVjdC94eHggdGFncyB0byB5b3VyIHRhc2tzLCBvciBjbGljayArIE5ldy4nXG4gICAgICApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgcHJvamVjdCBvZiBwcm9qZWN0cykge1xuICAgICAgY29uc3QgY2FyZCA9IGJvZHkuY3JlYXRlRGl2KCdtYy1wcm9qZWN0LWNhcmQnKTtcbiAgICAgIGNvbnN0IGNhcmRIZWFkZXIgPSBjYXJkLmNyZWF0ZURpdignbWMtcHJvamVjdC1oZWFkZXInKTtcblxuICAgICAgY29uc3QgaW5mbyA9IGNhcmRIZWFkZXIuY3JlYXRlRGl2KCdtYy1wcm9qZWN0LWluZm8nKTtcbiAgICAgIGNvbnN0IHBjdCA9IHByb2plY3QudG90YWxDb3VudCA+IDBcbiAgICAgICAgPyBNYXRoLnJvdW5kKChwcm9qZWN0LmRvbmVDb3VudCAvIHByb2plY3QudG90YWxDb3VudCkgKiAxMDApXG4gICAgICAgIDogMDtcbiAgICAgIGluZm8uY3JlYXRlU3Bhbih7IHRleHQ6IHByb2plY3QubmFtZSwgY2xzOiAnbWMtcHJvamVjdC1uYW1lJyB9KTtcbiAgICAgIGluZm8uY3JlYXRlU3Bhbih7IHRleHQ6IGAke3BjdH0lYCwgY2xzOiAnbWMtcHJvamVjdC1wY3QnIH0pO1xuXG4gICAgICBjb25zdCB0YXNrV2l0aERlYWRsaW5lID0gcHJvamVjdC50YXNrcy5maW5kKHQgPT4gdC50YXNrLmRlYWRsaW5lKTtcbiAgICAgIGNvbnN0IGRhdGVUZXh0ID0gdGFza1dpdGhEZWFkbGluZT8udGFzay5kZWFkbGluZVxuICAgICAgICA/IGAke3Byb2plY3Quc3RhcnREYXRlfSBcdTIxOTIgJHt0YXNrV2l0aERlYWRsaW5lLnRhc2suZGVhZGxpbmV9IChkZWFkbGluZSlgXG4gICAgICAgIDogYCR7cHJvamVjdC5zdGFydERhdGV9IFx1MjE5MiAke3Byb2plY3QuZW5kRGF0ZX1gO1xuICAgICAgY29uc3QgZGF0ZVNwYW4gPSBjYXJkSGVhZGVyLmNyZWF0ZVNwYW4oe1xuICAgICAgICB0ZXh0OiBkYXRlVGV4dCxcbiAgICAgICAgY2xzOiAnbWMtcHJvamVjdC1kYXRlcycsXG4gICAgICB9KTtcblxuICAgICAgLy8gUHJvZ3Jlc3MgYmFyXG4gICAgICBjb25zdCBiYXIgPSBjYXJkLmNyZWF0ZURpdignbWMtcHJvZ3Jlc3MtYmFyJyk7XG4gICAgICBjb25zdCBmaWxsID0gYmFyLmNyZWF0ZURpdignbWMtcHJvZ3Jlc3MtZmlsbCcpO1xuICAgICAgZmlsbC5zdHlsZS53aWR0aCA9IGAke3BjdH0lYDtcblxuICAgICAgaWYgKHBjdCA9PT0gMTAwKSB7XG4gICAgICAgIGZpbGwuYWRkQ2xhc3MoJ21jLXByb2dyZXNzLWRvbmUnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvamVjdC50YXNrcy5zb21lKHQgPT4gdC5kYXRlIDwgdG9kYXlTdHIoKSAmJiAhdC50YXNrLmRvbmUpKSB7XG4gICAgICAgIGZpbGwuYWRkQ2xhc3MoJ21jLXByb2dyZXNzLW92ZXJkdWUnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZpbGwuYWRkQ2xhc3MoJ21jLXByb2dyZXNzLW9udHJhY2snKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGV0YWlscyA9IGNhcmQuY3JlYXRlRGl2KCdtYy1wcm9qZWN0LWRldGFpbHMnKTtcbiAgICAgIGRldGFpbHMuc2V0VGV4dChgJHtwcm9qZWN0LmRvbmVDb3VudH0vJHtwcm9qZWN0LnRvdGFsQ291bnR9IHRhc2tzIGRvbmVgKTtcblxuICAgICAgY29uc3Qgb3ZlcmR1ZUNvdW50ID0gcHJvamVjdC50YXNrcy5maWx0ZXIoXG4gICAgICAgIHQgPT4gdC5kYXRlIDwgdG9kYXlTdHIoKSAmJiAhdC50YXNrLmRvbmVcbiAgICAgICkubGVuZ3RoO1xuICAgICAgaWYgKG92ZXJkdWVDb3VudCA+IDApIHtcbiAgICAgICAgZGV0YWlscy5jcmVhdGVTcGFuKHsgdGV4dDogYCBcdTAwQjcgXHUyNkEwICR7b3ZlcmR1ZUNvdW50fSBvdmVyZHVlYCwgY2xzOiAnbWMtcHJvamVjdC13YXJuaW5nJyB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gRXhwYW5kIHRvIHNob3cgdGFza3NcbiAgICAgIGNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHRhc2tMaXN0ID0gY2FyZC5xdWVyeVNlbGVjdG9yKCcubWMtcHJvamVjdC10YXNrcycpO1xuICAgICAgICBpZiAodGFza0xpc3QpIHtcbiAgICAgICAgICAodGFza0xpc3QgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmRpc3BsYXkgPVxuICAgICAgICAgICAgKHRhc2tMaXN0IGFzIEhUTUxFbGVtZW50KS5zdHlsZS5kaXNwbGF5ID09PSAnbm9uZScgPyAnYmxvY2snIDogJ25vbmUnO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgdGFza0xpc3QgPSBjYXJkLmNyZWF0ZURpdignbWMtcHJvamVjdC10YXNrcycpO1xuICAgICAgdGFza0xpc3Quc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgIGNvbnN0IHNvcnRlZFRhc2tzID0gWy4uLnByb2plY3QudGFza3NdLnNvcnQoKGEsIGIpID0+IGEuZGF0ZS5sb2NhbGVDb21wYXJlKGIuZGF0ZSkpO1xuICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBzb3J0ZWRUYXNrcykge1xuICAgICAgICBjb25zdCByb3cgPSB0YXNrTGlzdC5jcmVhdGVEaXYoJ21jLXByb2plY3QtdGFzay1yb3cnKTtcbiAgICAgICAgY29uc3QgZG90ID0gcm93LmNyZWF0ZURpdignbWMtcHJpb3JpdHktZG90Jyk7XG4gICAgICAgIGRvdC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBlbnRyeS50YXNrLmRvbmUgPyAnIzZiY2Y3ZicgOlxuICAgICAgICAgIChlbnRyeS5kYXRlIDwgdG9kYXlTdHIoKSA/ICcjZmY2YjZiJyA6ICcjZmZkOTNkJyk7XG4gICAgICAgIHJvdy5jcmVhdGVTcGFuKHsgdGV4dDogZW50cnkuZGF0ZSwgY2xzOiAnbWMtcHJvamVjdC10YXNrLWRhdGUnIH0pO1xuICAgICAgICByb3cuY3JlYXRlU3Bhbih7XG4gICAgICAgICAgdGV4dDogZW50cnkudGFzay50ZXh0LFxuICAgICAgICAgIGNsczogZW50cnkudGFzay5kb25lID8gJ21jLXRhc2stZG9uZScgOiAnJyxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChlbnRyeS50YXNrLmRlYWRsaW5lKSB7XG4gICAgICAgICAgcm93LmNyZWF0ZVNwYW4oe1xuICAgICAgICAgICAgdGV4dDogYCAgXHUyM0YwICR7ZW50cnkudGFzay5kZWFkbGluZX1gLFxuICAgICAgICAgICAgY2xzOiAnbWMtcHJvamVjdC1kZWFkbGluZScsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBHYW50dCBjaGFydCBzZWN0aW9uXG4gICAgY29uc3QgZ2FudHRTZWN0aW9uID0gYm9keS5jcmVhdGVEaXYoJ21jLWdhbnR0LXNlY3Rpb24nKTtcbiAgICBjb25zdCBnYW50dEhlYWRlciA9IGdhbnR0U2VjdGlvbi5jcmVhdGVEaXYoJ21jLXNlY3Rpb24taGVhZGVyJyk7XG4gICAgZ2FudHRIZWFkZXIuY3JlYXRlU3Bhbih7IHRleHQ6ICdHYW50dCBDaGFydCcsIGNsczogJ21jLXNlY3Rpb24tbGFiZWwnIH0pO1xuICAgIGNvbnN0IGdhbnR0Q29udGFpbmVyID0gZ2FudHRTZWN0aW9uLmNyZWF0ZURpdignbWMtZ2FudHQtY29udGFpbmVyJyk7XG4gICAgYXdhaXQgcmVuZGVyR2FudHRDaGFydChnYW50dENvbnRhaW5lciwgdmF1bHQpO1xuICB9XG5cbiAgcHJpdmF0ZSBzaG93QWRkUHJvamVjdE92ZXJsYXkoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgc3RhcnREYXRlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBmb3JtID0gY29udGFpbmVyLmNyZWF0ZURpdignbWMtYWRkLXByb2plY3QtZm9ybScpO1xuXG4gICAgY29uc3QgdGl0bGUgPSBmb3JtLmNyZWF0ZURpdignbWMtZm9ybS10aXRsZScpO1xuICAgIHRpdGxlLnNldFRleHQoJ05ldyBQcm9qZWN0Jyk7XG5cbiAgICBjb25zdCBuYW1lSW5wdXQgPSBmb3JtLmNyZWF0ZUVsKCdpbnB1dCcsIHtcbiAgICAgIHR5cGU6ICd0ZXh0JyxcbiAgICAgIHBsYWNlaG9sZGVyOiAnUHJvamVjdCBuYW1lLi4uJyxcbiAgICAgIGNsczogJ21jLXRhc2staW5wdXQnLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZGF0ZVJvdyA9IGZvcm0uY3JlYXRlRGl2KCdtYy1kYXRlLXJvdycpO1xuICAgIGRhdGVSb3cuY3JlYXRlU3Bhbih7IHRleHQ6ICdTdGFydDonLCBjbHM6ICdtYy1kYXRlLWxhYmVsJyB9KTtcbiAgICBjb25zdCBzdGFydElucHV0ID0gZGF0ZVJvdy5jcmVhdGVFbCgnaW5wdXQnLCB7XG4gICAgICB0eXBlOiAnZGF0ZScsXG4gICAgICBjbHM6ICdtYy1kYXRlLWlucHV0JyxcbiAgICB9KTtcbiAgICBzdGFydElucHV0LnZhbHVlID0gc3RhcnREYXRlO1xuXG4gICAgZGF0ZVJvdy5jcmVhdGVTcGFuKHsgdGV4dDogJ0VuZDonLCBjbHM6ICdtYy1kYXRlLWxhYmVsJyB9KTtcbiAgICBjb25zdCBlbmRJbnB1dCA9IGRhdGVSb3cuY3JlYXRlRWwoJ2lucHV0Jywge1xuICAgICAgdHlwZTogJ2RhdGUnLFxuICAgICAgY2xzOiAnbWMtZGF0ZS1pbnB1dCcsXG4gICAgfSk7XG4gICAgY29uc3QgZW5kRGF0ZSA9IG5ldyBEYXRlKCk7XG4gICAgZW5kRGF0ZS5zZXREYXRlKGVuZERhdGUuZ2V0RGF0ZSgpICsgMTQpO1xuICAgIGVuZElucHV0LnZhbHVlID0gZW5kRGF0ZS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKTtcblxuICAgIGNvbnN0IGJ0blJvdyA9IGZvcm0uY3JlYXRlRGl2KCdtYy1mb3JtLWJ0bnMnKTtcbiAgICBjb25zdCBzdWJtaXRCdG4gPSBidG5Sb3cuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ0NyZWF0ZScsIGNsczogJ21jLXN1Ym1pdC1idG4nIH0pO1xuICAgIHN1Ym1pdEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGFzeW5jICgpID0+IHtcbiAgICAgIGlmIChuYW1lSW5wdXQudmFsdWUudHJpbSgpICYmIHN0YXJ0SW5wdXQudmFsdWUgJiYgZW5kSW5wdXQudmFsdWUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCB2YXVsdCA9ICh0aGlzLmFwcCBhcyBhbnkpLnZhdWx0IGFzIFZhdWx0O1xuICAgICAgICAgIGF3YWl0IGNyZWF0ZVByb2plY3QodmF1bHQsIG5hbWVJbnB1dC52YWx1ZS50cmltKCksIHN0YXJ0SW5wdXQudmFsdWUsIGVuZElucHV0LnZhbHVlKTtcbiAgICAgICAgICBmb3JtLnJlbW92ZSgpO1xuICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBuZXcgTm90aWNlKGBGYWlsZWQgdG8gY3JlYXRlIHByb2plY3Q6ICR7ZXJyfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBjYW5jZWxCdG4gPSBidG5Sb3cuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ0NhbmNlbCcsIGNsczogJ21jLWNhbmNlbC1idG4nIH0pO1xuICAgIGNhbmNlbEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IGZvcm0ucmVtb3ZlKCkpO1xuXG4gICAgbmFtZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBhc3luYyAoZSkgPT4ge1xuICAgICAgaWYgKGUua2V5ID09PSAnRW50ZXInICYmIG5hbWVJbnB1dC52YWx1ZS50cmltKCkgJiYgc3RhcnRJbnB1dC52YWx1ZSAmJiBlbmRJbnB1dC52YWx1ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHZhdWx0ID0gKHRoaXMuYXBwIGFzIGFueSkudmF1bHQgYXMgVmF1bHQ7XG4gICAgICAgICAgYXdhaXQgY3JlYXRlUHJvamVjdCh2YXVsdCwgbmFtZUlucHV0LnZhbHVlLnRyaW0oKSwgc3RhcnRJbnB1dC52YWx1ZSwgZW5kSW5wdXQudmFsdWUpO1xuICAgICAgICAgIGZvcm0ucmVtb3ZlKCk7XG4gICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIG5ldyBOb3RpY2UoYEZhaWxlZCB0byBjcmVhdGUgcHJvamVjdDogJHtlcnJ9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2hvd0FkZFRhc2tPdmVybGF5KGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGRhdGU6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IGZvcm0gPSBjb250YWluZXIuY3JlYXRlRGl2KCdtYy1hZGQtdGFzay1mb3JtJyk7XG4gICAgY29uc3QgaW5wdXRSb3cgPSBmb3JtLmNyZWF0ZURpdignbWMtdGFzay1pbnB1dC1yb3cnKTtcbiAgICBjb25zdCBpbnB1dCA9IGlucHV0Um93LmNyZWF0ZUVsKCdpbnB1dCcsIHtcbiAgICAgIHR5cGU6ICd0ZXh0JyxcbiAgICAgIHBsYWNlaG9sZGVyOiAnVGFzayBkZXNjcmlwdGlvbi4uLicsXG4gICAgICBjbHM6ICdtYy10YXNrLWlucHV0JyxcbiAgICB9KTtcbiAgICBjb25zdCBwcmlvcml0eVNlbGVjdCA9IGlucHV0Um93LmNyZWF0ZUVsKCdzZWxlY3QnLCB7IGNsczogJ21jLXByaW9yaXR5LXNlbGVjdCcgfSk7XG4gICAgcHJpb3JpdHlTZWxlY3QuaW5uZXJIVE1MID0gYFxuICAgICAgPG9wdGlvbiB2YWx1ZT1cIm1lZGl1bVwiPk1lZGl1bTwvb3B0aW9uPlxuICAgICAgPG9wdGlvbiB2YWx1ZT1cImhpZ2hcIj5IaWdoPC9vcHRpb24+XG4gICAgICA8b3B0aW9uIHZhbHVlPVwibG93XCI+TG93PC9vcHRpb24+XG4gICAgYDtcblxuICAgIGNvbnN0IGRlYWRsaW5lUm93ID0gZm9ybS5jcmVhdGVEaXYoJ21jLWRlYWRsaW5lLXJvdycpO1xuICAgIGRlYWRsaW5lUm93LmNyZWF0ZVNwYW4oeyB0ZXh0OiAnRGVhZGxpbmU6JywgY2xzOiAnbWMtZGF0ZS1sYWJlbCcgfSk7XG4gICAgY29uc3QgZGVhZGxpbmVJbnB1dCA9IGRlYWRsaW5lUm93LmNyZWF0ZUVsKCdpbnB1dCcsIHtcbiAgICAgIHR5cGU6ICdkYXRlJyxcbiAgICAgIGNsczogJ21jLWRhdGUtaW5wdXQnLFxuICAgIH0pO1xuICAgIGRlYWRsaW5lUm93LmNyZWF0ZVNwYW4oeyB0ZXh0OiAnUmVtaW5kOicsIGNsczogJ21jLWRhdGUtbGFiZWwnIH0pO1xuICAgIGNvbnN0IHJlbWluZGVyU2VsZWN0ID0gZGVhZGxpbmVSb3cuY3JlYXRlRWwoJ3NlbGVjdCcsIHsgY2xzOiAnbWMtcHJpb3JpdHktc2VsZWN0JyB9KTtcbiAgICByZW1pbmRlclNlbGVjdC5pbm5lckhUTUwgPSBgXG4gICAgICA8b3B0aW9uIHZhbHVlPVwiXCI+Tm8gcmVtaW5kZXI8L29wdGlvbj5cbiAgICAgIDxvcHRpb24gdmFsdWU9XCIxZGF5XCI+MSBkYXkgYmVmb3JlPC9vcHRpb24+XG4gICAgICA8b3B0aW9uIHZhbHVlPVwiM2RheXNcIj4zIGRheXMgYmVmb3JlPC9vcHRpb24+XG4gICAgICA8b3B0aW9uIHZhbHVlPVwiMXdlZWtcIj4xIHdlZWsgYmVmb3JlPC9vcHRpb24+XG4gICAgYDtcblxuICAgIGNvbnN0IGJ0blJvdyA9IGZvcm0uY3JlYXRlRGl2KCdtYy1mb3JtLWJ0bnMnKTtcbiAgICBjb25zdCBzdWJtaXRCdG4gPSBidG5Sb3cuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ0FkZCcsIGNsczogJ21jLXN1Ym1pdC1idG4nIH0pO1xuICAgIHN1Ym1pdEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGFzeW5jICgpID0+IHtcbiAgICAgIGlmIChpbnB1dC52YWx1ZS50cmltKCkpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBkZWFkbGluZSA9IGRlYWRsaW5lSW5wdXQudmFsdWUgfHwgdW5kZWZpbmVkO1xuICAgICAgICAgIGNvbnN0IHJlbWluZGVyID0gKHJlbWluZGVyU2VsZWN0LnZhbHVlIHx8IHVuZGVmaW5lZCkgYXMgUmVtaW5kZXJPZmZzZXQgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgYXdhaXQgdGhpcy50YXNrTWFuYWdlci5hZGRUYXNrKFxuICAgICAgICAgICAgZGF0ZSxcbiAgICAgICAgICAgIGlucHV0LnZhbHVlLnRyaW0oKSxcbiAgICAgICAgICAgIHByaW9yaXR5U2VsZWN0LnZhbHVlIGFzIFRhc2tbJ3ByaW9yaXR5J10sXG4gICAgICAgICAgICBkZWFkbGluZSxcbiAgICAgICAgICAgIHJlbWluZGVyIHx8IHVuZGVmaW5lZFxuICAgICAgICAgICk7XG4gICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIG5ldyBOb3RpY2UoYEZhaWxlZCB0byBhZGQgdGFzazogJHtlcnJ9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IGNhbmNlbEJ0biA9IGJ0blJvdy5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnQ2FuY2VsJywgY2xzOiAnbWMtY2FuY2VsLWJ0bicgfSk7XG4gICAgY2FuY2VsQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgZm9ybS5yZW1vdmUoKTtcbiAgICB9KTtcblxuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBhc3luYyAoZSkgPT4ge1xuICAgICAgaWYgKGUua2V5ID09PSAnRW50ZXInICYmIGlucHV0LnZhbHVlLnRyaW0oKSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IGRlYWRsaW5lID0gZGVhZGxpbmVJbnB1dC52YWx1ZSB8fCB1bmRlZmluZWQ7XG4gICAgICAgICAgY29uc3QgcmVtaW5kZXIgPSAocmVtaW5kZXJTZWxlY3QudmFsdWUgfHwgdW5kZWZpbmVkKSBhcyBSZW1pbmRlck9mZnNldCB8IHVuZGVmaW5lZDtcbiAgICAgICAgICBhd2FpdCB0aGlzLnRhc2tNYW5hZ2VyLmFkZFRhc2soXG4gICAgICAgICAgICBkYXRlLFxuICAgICAgICAgICAgaW5wdXQudmFsdWUudHJpbSgpLFxuICAgICAgICAgICAgcHJpb3JpdHlTZWxlY3QudmFsdWUgYXMgVGFza1sncHJpb3JpdHknXSxcbiAgICAgICAgICAgIGRlYWRsaW5lLFxuICAgICAgICAgICAgcmVtaW5kZXIgfHwgdW5kZWZpbmVkXG4gICAgICAgICAgKTtcbiAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgbmV3IE5vdGljZShgRmFpbGVkIHRvIGFkZCB0YXNrOiAke2Vycn1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZW5kZXJSZW1pbmRlckJhbm5lcihjb250YWluZXI6IEhUTUxFbGVtZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMub3ZlcmR1ZVRhc2tzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXG4gICAgY29uc3QgYmFubmVyID0gY29udGFpbmVyLmNyZWF0ZURpdignbWMtcmVtaW5kZXItYmFubmVyJyk7XG4gICAgY29uc3Qgb3ZlcmR1ZSA9IHRoaXMub3ZlcmR1ZVRhc2tzLmZpbHRlcih0ID0+IHQuZGF0ZSA8IHRvZGF5U3RyKCkpO1xuICAgIGNvbnN0IHRvZGF5ID0gdGhpcy5vdmVyZHVlVGFza3MuZmlsdGVyKHQgPT4gdC5kYXRlID09PSB0b2RheVN0cigpKTtcblxuICAgIGlmIChvdmVyZHVlLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IG92ZXJkdWVFbCA9IGJhbm5lci5jcmVhdGVEaXYoJ21jLXJlbWluZGVyLW92ZXJkdWUnKTtcbiAgICAgIG92ZXJkdWVFbC5jcmVhdGVTcGFuKHsgdGV4dDogYFx1MjZBMCBPdmVyZHVlOiAke292ZXJkdWUubGVuZ3RofSB0YXNrKHMpYCB9KTtcblxuICAgICAgZm9yIChjb25zdCBpdGVtIG9mIG92ZXJkdWUuc2xpY2UoMCwgMykpIHtcbiAgICAgICAgb3ZlcmR1ZUVsLmNyZWF0ZURpdignbWMtcmVtaW5kZXItaXRlbScpLnNldFRleHQoXG4gICAgICAgICAgYCR7aXRlbS5kYXRlfTogJHtpdGVtLnRhc2sudGV4dH1gXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRvZGF5Lmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IHRvZGF5RWwgPSBiYW5uZXIuY3JlYXRlRGl2KCdtYy1yZW1pbmRlci10b2RheScpO1xuICAgICAgdG9kYXlFbC5jcmVhdGVTcGFuKHsgdGV4dDogYFxcdXsxRjRDQ30gVG9kYXk6ICR7dG9kYXkubGVuZ3RofSB0YXNrKHMpYCB9KTtcbiAgICB9XG4gIH1cbn1cbiIsICJleHBvcnQgdHlwZSBSZW1pbmRlck9mZnNldCA9ICcxZGF5JyB8ICczZGF5cycgfCAnMXdlZWsnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRhc2sge1xuICBpZDogc3RyaW5nO1xuICB0ZXh0OiBzdHJpbmc7XG4gIGRvbmU6IGJvb2xlYW47XG4gIHByaW9yaXR5OiAnbG93JyB8ICdtZWRpdW0nIHwgJ2hpZ2gnO1xuICB0YWdzOiBzdHJpbmdbXTtcbiAgZGVhZGxpbmU/OiBzdHJpbmc7XG4gIHJlbWluZGVyPzogUmVtaW5kZXJPZmZzZXQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGF5RGF0YSB7XG4gIGRhdGU6IHN0cmluZztcbiAgcGF0aDogc3RyaW5nO1xuICB0YXNrczogVGFza1tdO1xuICBib2R5OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2FsZW5kYXJTdGF0ZSB7XG4gIGN1cnJlbnRZZWFyOiBudW1iZXI7XG4gIGN1cnJlbnRNb250aDogbnVtYmVyO1xuICBzZWxlY3RlZERhdGU6IHN0cmluZyB8IG51bGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvamVjdCB7XG4gIG5hbWU6IHN0cmluZztcbiAgdGFnOiBzdHJpbmc7XG4gIHRhc2tzOiB7IGRhdGU6IHN0cmluZzsgdGFzazogVGFzayB9W107XG4gIHN0YXJ0RGF0ZTogc3RyaW5nO1xuICBlbmREYXRlOiBzdHJpbmc7XG4gIGRvbmVDb3VudDogbnVtYmVyO1xuICB0b3RhbENvdW50OiBudW1iZXI7XG59XG5cbmV4cG9ydCB0eXBlIFZpZXdNb2RlID0gJ2NhbGVuZGFyJyB8ICdwcm9qZWN0cyc7XG5cbmV4cG9ydCBjb25zdCBWSUVXX1RZUEVfQ0FMRU5EQVIgPSAnbWVtby1jYWxlbmRhci12aWV3JztcblxuZXhwb3J0IGNvbnN0IERJQVJZX0ZPTERFUiA9ICdcdTY1RTVcdThCQjAnO1xuXG5leHBvcnQgY29uc3QgUFJJT1JJVFlfQ09MT1JTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBoaWdoOiAnI2ZmNmI2YicsXG4gIG1lZGl1bTogJyNmZmQ5M2QnLFxuICBsb3c6ICcjNmJjZjdmJyxcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUlkKCk6IHN0cmluZyB7XG4gIHJldHVybiBjcnlwdG8ucmFuZG9tVVVJRCgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9kYXlTdHIoKTogc3RyaW5nIHtcbiAgY29uc3QgZCA9IG5ldyBEYXRlKCk7XG4gIHJldHVybiBgJHtkLmdldEZ1bGxZZWFyKCl9LSR7U3RyaW5nKGQuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsICcwJyl9LSR7U3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpfWA7XG59XG4iLCAiaW1wb3J0IHsgVmF1bHQsIFRGaWxlIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgRElBUllfRk9MREVSIH0gZnJvbSAnLi90eXBlcyc7XG5cbmNvbnN0IERJQVJZX1JFID0gL15cXGR7NH0tXFxkezJ9LVxcZHsyfVxcLm1kJC87XG5cbi8qKlxuICogU2NhbiB0aGUgdmF1bHQgZm9yIGRpYXJ5IGZpbGVzLiBSZXR1cm5zIHZhdWx0LXJlbGF0aXZlIHBhdGhzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2NhbkRpYXJ5RmlsZXModmF1bHQ6IFZhdWx0KTogVEZpbGVbXSB7XG4gIGNvbnN0IGZvbGRlciA9IHZhdWx0LmdldEZvbGRlckJ5UGF0aChESUFSWV9GT0xERVIpO1xuICBpZiAoIWZvbGRlcikgcmV0dXJuIFtdO1xuICBjb25zdCBmaWxlcyA9IChmb2xkZXIgYXMgYW55KS5jaGlsZHJlbj8uZmlsdGVyKFxuICAgIChmOiBhbnkpID0+IGYgaW5zdGFuY2VvZiBURmlsZSAmJiBESUFSWV9SRS50ZXN0KGYubmFtZSlcbiAgKSB8fCBbXTtcbiAgcmV0dXJuIGZpbGVzIGFzIFRGaWxlW107XG59XG5cbi8qKlxuICogR2V0IHRoZSB2YXVsdC1yZWxhdGl2ZSBwYXRoIGZvciBhIGdpdmVuIGRhdGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaWFyeVBhdGgoZGF0ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke0RJQVJZX0ZPTERFUn0vJHtkYXRlfS5tZGA7XG59XG5cbi8qKlxuICogRW5zdXJlIHRoZSBkaWFyeSBmb2xkZXIgZXhpc3RzLiBDYWxsZWQgb24gcGx1Z2luIGluaXQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbnN1cmVEaWFyeUZvbGRlcih2YXVsdDogVmF1bHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgZXhpc3RzID0gdmF1bHQuZ2V0Rm9sZGVyQnlQYXRoKERJQVJZX0ZPTERFUik7XG4gIGlmICghZXhpc3RzKSB7XG4gICAgYXdhaXQgdmF1bHQuY3JlYXRlRm9sZGVyKERJQVJZX0ZPTERFUik7XG4gIH1cbn1cblxuLyoqXG4gKiBHcm91cCBkaWFyeSBmaWxlcyBieSBtb250aDogcmV0dXJucyBNYXA8XCJZWVlZLU1NXCIsIFRGaWxlW10+XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBncm91cEJ5TW9udGgoZmlsZXM6IFRGaWxlW10pOiBNYXA8c3RyaW5nLCBURmlsZVtdPiB7XG4gIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBURmlsZVtdPigpO1xuICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICBjb25zdCBuYW1lID0gZmlsZS5uYW1lOyAvLyBZWVlZLU1NLURELm1kXG4gICAgY29uc3QgbW9udGggPSBuYW1lLnNsaWNlKDAsIDcpOyAvLyBZWVlZLU1NXG4gICAgaWYgKCFtYXAuaGFzKG1vbnRoKSkgbWFwLnNldChtb250aCwgW10pO1xuICAgIG1hcC5nZXQobW9udGgpIS5wdXNoKGZpbGUpO1xuICB9XG4gIHJldHVybiBtYXA7XG59XG5cbi8qKlxuICogR2V0IHRoZSBzZXQgb2YgZGF0ZXMgKGRheXMgb2YgbW9udGgpIHRoYXQgaGF2ZSBkaWFyeSBmaWxlcyBmb3IgYSBnaXZlbiBtb250aC5cbiAqIFJldHVybnMgU2V0IG9mIGRheSBudW1iZXJzICgxLTMxKSB0aGF0IGV4aXN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGF5c1dpdGhFbnRyaWVzKGZpbGVzOiBURmlsZVtdLCB5ZWFyOiBudW1iZXIsIG1vbnRoOiBudW1iZXIpOiBTZXQ8bnVtYmVyPiB7XG4gIGNvbnN0IHByZWZpeCA9IGAke3llYXJ9LSR7U3RyaW5nKG1vbnRoICsgMSkucGFkU3RhcnQoMiwgJzAnKX1gO1xuICBjb25zdCBkYXlzID0gbmV3IFNldDxudW1iZXI+KCk7XG4gIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgIGlmIChmaWxlLm5hbWUuc3RhcnRzV2l0aChwcmVmaXgpKSB7XG4gICAgICBjb25zdCBkYXkgPSBwYXJzZUludChmaWxlLm5hbWUuc2xpY2UoOCwgMTApLCAxMCk7XG4gICAgICBpZiAoIWlzTmFOKGRheSkpIGRheXMuYWRkKGRheSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBkYXlzO1xufVxuIiwgImltcG9ydCB7IFRhc2sgfSBmcm9tICcuL3R5cGVzJztcblxuY29uc3QgRlJPTlRNQVRURVJfUkUgPSAvXi0tLVxcbihbXFxzXFxTXSo/KVxcbi0tLVxcbj8oW1xcc1xcU10qKSQvO1xuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VGcm9udG1hdHRlcihjb250ZW50OiBzdHJpbmcpOiB7IHRhc2tzOiBUYXNrW107IGJvZHk6IHN0cmluZyB9IHwgbnVsbCB7XG4gIGNvbnN0IG1hdGNoID0gY29udGVudC5tYXRjaChGUk9OVE1BVFRFUl9SRSk7XG4gIGlmICghbWF0Y2gpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IHlhbWxCbG9jayA9IG1hdGNoWzFdO1xuICBjb25zdCBib2R5ID0gbWF0Y2hbMl0gfHwgJyc7XG5cbiAgY29uc3QgdGFza3M6IFRhc2tbXSA9IFtdO1xuICBjb25zdCBsaW5lcyA9IHlhbWxCbG9jay5zcGxpdCgnXFxuJyk7XG5cbiAgbGV0IGluVGFza3MgPSBmYWxzZTtcbiAgbGV0IGN1cnJlbnRUYXNrOiBQYXJ0aWFsPFRhc2s+IHwgbnVsbCA9IG51bGw7XG5cbiAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XG4gICAgY29uc3QgdHJpbW1lZCA9IGxpbmUudHJpbSgpO1xuXG4gICAgaWYgKHRyaW1tZWQgPT09ICd0YXNrczonKSB7XG4gICAgICBpblRhc2tzID0gdHJ1ZTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChpblRhc2tzICYmIHRyaW1tZWQuc3RhcnRzV2l0aCgnLScpKSB7XG4gICAgICBpZiAoY3VycmVudFRhc2sgJiYgY3VycmVudFRhc2suaWQgJiYgY3VycmVudFRhc2sudGV4dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRhc2tzLnB1c2goe1xuICAgICAgICAgIGlkOiBjdXJyZW50VGFzay5pZCxcbiAgICAgICAgICB0ZXh0OiBjdXJyZW50VGFzay50ZXh0LFxuICAgICAgICAgIGRvbmU6IGN1cnJlbnRUYXNrLmRvbmUgPz8gZmFsc2UsXG4gICAgICAgICAgcHJpb3JpdHk6IGN1cnJlbnRUYXNrLnByaW9yaXR5ID8/ICdtZWRpdW0nLFxuICAgICAgICAgIHRhZ3M6IGN1cnJlbnRUYXNrLnRhZ3MgPz8gW10sXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY3VycmVudFRhc2sgPSB7fTtcbiAgICAgIGNvbnN0IGlubGluZSA9IHRyaW1tZWQucmVwbGFjZSgvXi1cXHMqLywgJycpO1xuICAgICAgcGFyc2VUYXNrSW5saW5lKGlubGluZSwgY3VycmVudFRhc2spO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGluVGFza3MgJiYgY3VycmVudFRhc2sgJiYgdHJpbW1lZCAhPT0gJycpIHtcbiAgICAgIHBhcnNlVGFza1Byb3BlcnR5KHRyaW1tZWQsIGN1cnJlbnRUYXNrKTtcbiAgICB9XG5cbiAgICBpZiAoaW5UYXNrcyAmJiB0cmltbWVkID09PSAnJyAmJiBjdXJyZW50VGFzaykge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGluVGFza3MgJiYgIXRyaW1tZWQuc3RhcnRzV2l0aCgnLScpICYmICF0cmltbWVkLnN0YXJ0c1dpdGgoJyAgJykgJiYgIXRyaW1tZWQuc3RhcnRzV2l0aCgnXFx0JykpIHtcbiAgICAgIGlmIChjdXJyZW50VGFzayAmJiBjdXJyZW50VGFzay5pZCAmJiBjdXJyZW50VGFzay50ZXh0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGFza3MucHVzaCh7XG4gICAgICAgICAgaWQ6IGN1cnJlbnRUYXNrLmlkLFxuICAgICAgICAgIHRleHQ6IGN1cnJlbnRUYXNrLnRleHQsXG4gICAgICAgICAgZG9uZTogY3VycmVudFRhc2suZG9uZSA/PyBmYWxzZSxcbiAgICAgICAgICBwcmlvcml0eTogY3VycmVudFRhc2sucHJpb3JpdHkgPz8gJ21lZGl1bScsXG4gICAgICAgICAgdGFnczogY3VycmVudFRhc2sudGFncyA/PyBbXSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjdXJyZW50VGFzayA9IG51bGw7XG4gICAgICBpblRhc2tzID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaWYgKGN1cnJlbnRUYXNrICYmIGN1cnJlbnRUYXNrLmlkICYmIGN1cnJlbnRUYXNrLnRleHQgIT09IHVuZGVmaW5lZCkge1xuICAgIHRhc2tzLnB1c2goe1xuICAgICAgaWQ6IGN1cnJlbnRUYXNrLmlkLFxuICAgICAgdGV4dDogY3VycmVudFRhc2sudGV4dCxcbiAgICAgIGRvbmU6IGN1cnJlbnRUYXNrLmRvbmUgPz8gZmFsc2UsXG4gICAgICBwcmlvcml0eTogY3VycmVudFRhc2sucHJpb3JpdHkgPz8gJ21lZGl1bScsXG4gICAgICB0YWdzOiBjdXJyZW50VGFzay50YWdzID8/IFtdLFxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHsgdGFza3MsIGJvZHkgfTtcbn1cblxuZnVuY3Rpb24gcGFyc2VUYXNrSW5saW5lKGxpbmU6IHN0cmluZywgdGFzazogUGFydGlhbDxUYXNrPik6IHZvaWQge1xuICBjb25zdCBwYXJ0cyA9IHNwbGl0QnlDb21tYShsaW5lKTtcbiAgZm9yIChjb25zdCBwYXJ0IG9mIHBhcnRzKSB7XG4gICAgcGFyc2VUYXNrUHJvcGVydHkocGFydC50cmltKCksIHRhc2spO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNwbGl0QnlDb21tYShzdHI6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgY3VycmVudCA9ICcnO1xuICBsZXQgaW5RdW90ZXMgPSBmYWxzZTtcbiAgbGV0IGluQnJhY2tldHMgPSAwO1xuXG4gIGZvciAoY29uc3QgY2ggb2Ygc3RyKSB7XG4gICAgaWYgKGNoID09PSAnXCInKSBpblF1b3RlcyA9ICFpblF1b3RlcztcbiAgICBpZiAoY2ggPT09ICdbJyAmJiAhaW5RdW90ZXMpIGluQnJhY2tldHMrKztcbiAgICBpZiAoY2ggPT09ICddJyAmJiAhaW5RdW90ZXMpIGluQnJhY2tldHMtLTtcbiAgICBpZiAoY2ggPT09ICcsJyAmJiAhaW5RdW90ZXMgJiYgaW5CcmFja2V0cyA9PT0gMCkge1xuICAgICAgcmVzdWx0LnB1c2goY3VycmVudCk7XG4gICAgICBjdXJyZW50ID0gJyc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN1cnJlbnQgKz0gY2g7XG4gICAgfVxuICB9XG4gIGlmIChjdXJyZW50LnRyaW0oKSkgcmVzdWx0LnB1c2goY3VycmVudCk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHBhcnNlVGFza1Byb3BlcnR5KHRyaW1tZWQ6IHN0cmluZywgdGFzazogUGFydGlhbDxUYXNrPik6IHZvaWQge1xuICBjb25zdCBjb2xvbklkeCA9IHRyaW1tZWQuaW5kZXhPZignOicpO1xuICBpZiAoY29sb25JZHggPT09IC0xKSByZXR1cm47XG5cbiAgY29uc3Qga2V5ID0gdHJpbW1lZC5zbGljZSgwLCBjb2xvbklkeCkudHJpbSgpO1xuICBsZXQgdmFsdWUgPSB0cmltbWVkLnNsaWNlKGNvbG9uSWR4ICsgMSkudHJpbSgpO1xuXG4gIHZhbHVlID0gdmFsdWUucmVwbGFjZSgvXlwiKC4qKVwiJC8sICckMScpO1xuICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKTtcblxuICBzd2l0Y2ggKGtleSkge1xuICAgIGNhc2UgJ2lkJzpcbiAgICAgIHRhc2suaWQgPSB2YWx1ZTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3RleHQnOlxuICAgICAgdGFzay50ZXh0ID0gdmFsdWU7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdkb25lJzpcbiAgICAgIHRhc2suZG9uZSA9IHZhbHVlID09PSAndHJ1ZSc7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdwcmlvcml0eSc6XG4gICAgICB0YXNrLnByaW9yaXR5ID0gKHZhbHVlID09PSAnaGlnaCcgfHwgdmFsdWUgPT09ICdsb3cnKSA/IHZhbHVlIDogJ21lZGl1bSc7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdkZWFkbGluZSc6XG4gICAgICB0YXNrLmRlYWRsaW5lID0gdmFsdWU7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyZW1pbmRlcic6XG4gICAgICBpZiAodmFsdWUgPT09ICcxZGF5JyB8fCB2YWx1ZSA9PT0gJzNkYXlzJyB8fCB2YWx1ZSA9PT0gJzF3ZWVrJykge1xuICAgICAgICB0YXNrLnJlbWluZGVyID0gdmFsdWU7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICd0YWdzJzpcbiAgICAgIGNvbnN0IGFyck1hdGNoID0gdmFsdWUubWF0Y2goL15cXFsoLiopXFxdJC8pO1xuICAgICAgaWYgKGFyck1hdGNoKSB7XG4gICAgICAgIHRhc2sudGFncyA9IGFyck1hdGNoWzFdLnNwbGl0KCcsJykubWFwKHQgPT4gdC50cmltKCkucmVwbGFjZSgvXlwiKC4qKVwiJC8sICckMScpLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSkuZmlsdGVyKEJvb2xlYW4pO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZUZyb250bWF0dGVyKHRhc2tzOiBUYXNrW10sIGJvZHk6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHlhbWxUYXNrcyA9IHRhc2tzLm1hcCh0ID0+IHtcbiAgICBjb25zdCB0YWdzID0gYFske3QudGFncy5tYXAoeCA9PiBgXCIke3gucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpfVwiYCkuam9pbignLCAnKX1dYDtcbiAgICBjb25zdCBkZWFkbGluZUxpbmUgPSB0LmRlYWRsaW5lID8gYFxcbiAgICBkZWFkbGluZTogXCIke3QuZGVhZGxpbmV9XCJgIDogJyc7XG4gICAgY29uc3QgcmVtaW5kZXJMaW5lID0gdC5yZW1pbmRlciA/IGBcXG4gICAgcmVtaW5kZXI6ICR7dC5yZW1pbmRlcn1gIDogJyc7XG4gICAgcmV0dXJuIGAgIC0gaWQ6IFwiJHt0LmlkfVwiXFxuICAgIHRleHQ6IFwiJHt0LnRleHQucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpfVwiXFxuICAgIGRvbmU6ICR7dC5kb25lfVxcbiAgICBwcmlvcml0eTogJHt0LnByaW9yaXR5fVxcbiAgICB0YWdzOiAke3RhZ3N9JHtkZWFkbGluZUxpbmV9JHtyZW1pbmRlckxpbmV9YDtcbiAgfSkuam9pbignXFxuJyk7XG5cbiAgY29uc3QgeWFtbEJsb2NrID0gdGFza3MubGVuZ3RoID4gMFxuICAgID8gYHRhc2tzOlxcbiR7eWFtbFRhc2tzfWBcbiAgICA6ICcnO1xuXG4gIHJldHVybiB5YW1sQmxvY2tcbiAgICA/IGAtLS1cXG4ke3lhbWxCbG9ja31cXG4tLS1cXG4ke2JvZHl9YFxuICAgIDogYC0tLVxcbi0tLVxcbiR7Ym9keX1gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlRnJvbnRtYXR0ZXIoY29udGVudDogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKEZST05UTUFUVEVSX1JFLnRlc3QoY29udGVudCkpIHJldHVybiBjb250ZW50O1xuICByZXR1cm4gYC0tLVxcbi0tLVxcbiR7Y29udGVudH1gO1xufVxuIiwgImltcG9ydCB7IFZhdWx0IH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgVGFzaywgRGF5RGF0YSwgZ2VuZXJhdGVJZCB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgZGlhcnlQYXRoIH0gZnJvbSAnLi9zY2FubmVyJztcbmltcG9ydCB7IHBhcnNlRnJvbnRtYXR0ZXIsIHNlcmlhbGl6ZUZyb250bWF0dGVyLCBlbnN1cmVGcm9udG1hdHRlciB9IGZyb20gJy4vcGFyc2VyJztcblxuZXhwb3J0IGNsYXNzIFRhc2tNYW5hZ2VyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSB2YXVsdDogVmF1bHQpIHt9XG5cbiAgYXN5bmMgZ2V0RGF5KGRhdGU6IHN0cmluZyk6IFByb21pc2U8RGF5RGF0YT4ge1xuICAgIGNvbnN0IHBhdGggPSBkaWFyeVBhdGgoZGF0ZSk7XG4gICAgY29uc3QgZmlsZSA9IHRoaXMudmF1bHQuZ2V0RmlsZUJ5UGF0aChwYXRoKTtcblxuICAgIGlmICghZmlsZSkge1xuICAgICAgcmV0dXJuIHsgZGF0ZSwgcGF0aCwgdGFza3M6IFtdLCBib2R5OiAnJyB9O1xuICAgIH1cblxuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLnZhdWx0LmNhY2hlZFJlYWQoZmlsZSk7XG4gICAgY29uc3QgcGFyc2VkID0gcGFyc2VGcm9udG1hdHRlcihjb250ZW50KTtcblxuICAgIHJldHVybiB7XG4gICAgICBkYXRlLFxuICAgICAgcGF0aCxcbiAgICAgIHRhc2tzOiBwYXJzZWQ/LnRhc2tzID8/IFtdLFxuICAgICAgYm9keTogcGFyc2VkPy5ib2R5ID8/IGNvbnRlbnQsXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIGFkZFRhc2soZGF0ZTogc3RyaW5nLCB0ZXh0OiBzdHJpbmcsIHByaW9yaXR5OiBUYXNrWydwcmlvcml0eSddID0gJ21lZGl1bScsIGRlYWRsaW5lPzogc3RyaW5nLCByZW1pbmRlcj86IFRhc2tbJ3JlbWluZGVyJ10pOiBQcm9taXNlPFRhc2s+IHtcbiAgICBjb25zdCB0YXNrOiBUYXNrID0ge1xuICAgICAgaWQ6IGdlbmVyYXRlSWQoKSxcbiAgICAgIHRleHQsXG4gICAgICBkb25lOiBmYWxzZSxcbiAgICAgIHByaW9yaXR5LFxuICAgICAgdGFnczogW10sXG4gICAgfTtcbiAgICBpZiAoZGVhZGxpbmUpIHRhc2suZGVhZGxpbmUgPSBkZWFkbGluZTtcbiAgICBpZiAocmVtaW5kZXIpIHRhc2sucmVtaW5kZXIgPSByZW1pbmRlcjtcblxuICAgIGNvbnN0IHBhdGggPSBkaWFyeVBhdGgoZGF0ZSk7XG4gICAgY29uc3QgZmlsZSA9IHRoaXMudmF1bHQuZ2V0RmlsZUJ5UGF0aChwYXRoKTtcblxuICAgIGlmICghZmlsZSkge1xuICAgICAgY29uc3QgY29udGVudCA9IHNlcmlhbGl6ZUZyb250bWF0dGVyKFt0YXNrXSwgJycpO1xuICAgICAgYXdhaXQgdGhpcy52YXVsdC5jcmVhdGUocGF0aCwgY29udGVudCk7XG4gICAgICByZXR1cm4gdGFzaztcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnZhdWx0LnByb2Nlc3MoZmlsZSwgKGNvbnRlbnQpID0+IHtcbiAgICAgIGNvbnN0IHdpdGhGbSA9IGVuc3VyZUZyb250bWF0dGVyKGNvbnRlbnQpO1xuICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VGcm9udG1hdHRlcih3aXRoRm0pO1xuICAgICAgY29uc3QgdGFza3MgPSBwYXJzZWQ/LnRhc2tzID8/IFtdO1xuICAgICAgdGFza3MucHVzaCh0YXNrKTtcbiAgICAgIHJldHVybiBzZXJpYWxpemVGcm9udG1hdHRlcih0YXNrcywgcGFyc2VkPy5ib2R5ID8/ICcnKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB0YXNrO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlVGFzayhkYXRlOiBzdHJpbmcsIHRhc2tJZDogc3RyaW5nLCB1cGRhdGVzOiBQYXJ0aWFsPFRhc2s+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcGF0aCA9IGRpYXJ5UGF0aChkYXRlKTtcbiAgICBjb25zdCBmaWxlID0gdGhpcy52YXVsdC5nZXRGaWxlQnlQYXRoKHBhdGgpO1xuICAgIGlmICghZmlsZSkgcmV0dXJuO1xuXG4gICAgYXdhaXQgdGhpcy52YXVsdC5wcm9jZXNzKGZpbGUsIChjb250ZW50KSA9PiB7XG4gICAgICBjb25zdCB3aXRoRm0gPSBlbnN1cmVGcm9udG1hdHRlcihjb250ZW50KTtcbiAgICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlRnJvbnRtYXR0ZXIod2l0aEZtKTtcbiAgICAgIGlmICghcGFyc2VkKSByZXR1cm4gY29udGVudDtcblxuICAgICAgY29uc3QgdGFza3MgPSBwYXJzZWQudGFza3MubWFwKHQgPT5cbiAgICAgICAgdC5pZCA9PT0gdGFza0lkID8geyAuLi50LCAuLi51cGRhdGVzIH0gOiB0XG4gICAgICApO1xuICAgICAgcmV0dXJuIHNlcmlhbGl6ZUZyb250bWF0dGVyKHRhc2tzLCBwYXJzZWQuYm9keSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBkZWxldGVUYXNrKGRhdGU6IHN0cmluZywgdGFza0lkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBwYXRoID0gZGlhcnlQYXRoKGRhdGUpO1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLnZhdWx0LmdldEZpbGVCeVBhdGgocGF0aCk7XG4gICAgaWYgKCFmaWxlKSByZXR1cm47XG5cbiAgICBhd2FpdCB0aGlzLnZhdWx0LnByb2Nlc3MoZmlsZSwgKGNvbnRlbnQpID0+IHtcbiAgICAgIGNvbnN0IHdpdGhGbSA9IGVuc3VyZUZyb250bWF0dGVyKGNvbnRlbnQpO1xuICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VGcm9udG1hdHRlcih3aXRoRm0pO1xuICAgICAgaWYgKCFwYXJzZWQpIHJldHVybiBjb250ZW50O1xuXG4gICAgICBjb25zdCB0YXNrcyA9IHBhcnNlZC50YXNrcy5maWx0ZXIodCA9PiB0LmlkICE9PSB0YXNrSWQpO1xuICAgICAgcmV0dXJuIHNlcmlhbGl6ZUZyb250bWF0dGVyKHRhc2tzLCBwYXJzZWQuYm9keSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBhcHBlbmRCb2R5KGRhdGU6IHN0cmluZywgdGV4dDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcGF0aCA9IGRpYXJ5UGF0aChkYXRlKTtcbiAgICBjb25zdCBmaWxlID0gdGhpcy52YXVsdC5nZXRGaWxlQnlQYXRoKHBhdGgpO1xuXG4gICAgaWYgKCFmaWxlKSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gYC0tLVxcbi0tLVxcbiR7dGV4dH1cXG5gO1xuICAgICAgYXdhaXQgdGhpcy52YXVsdC5jcmVhdGUocGF0aCwgY29udGVudCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy52YXVsdC5wcm9jZXNzKGZpbGUsIChjb250ZW50KSA9PiB7XG4gICAgICBjb25zdCB3aXRoRm0gPSBlbnN1cmVGcm9udG1hdHRlcihjb250ZW50KTtcbiAgICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlRnJvbnRtYXR0ZXIod2l0aEZtKTtcbiAgICAgIGlmICghcGFyc2VkKSByZXR1cm4gY29udGVudDtcbiAgICAgIGNvbnN0IG5ld0JvZHkgPSBwYXJzZWQuYm9keSArICdcXG4nICsgdGV4dDtcbiAgICAgIHJldHVybiBzZXJpYWxpemVGcm9udG1hdHRlcihwYXJzZWQudGFza3MsIG5ld0JvZHkpO1xuICAgIH0pO1xuICB9XG59XG4iLCAiaW1wb3J0IHsgVmF1bHQsIFRGaWxlIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgVGFzaywgdG9kYXlTdHIsIFJlbWluZGVyT2Zmc2V0IH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBzY2FuRGlhcnlGaWxlcyB9IGZyb20gJy4vc2Nhbm5lcic7XG5pbXBvcnQgeyBwYXJzZUZyb250bWF0dGVyIH0gZnJvbSAnLi9wYXJzZXInO1xuXG5leHBvcnQgaW50ZXJmYWNlIE92ZXJkdWVUYXNrIHtcbiAgZGF0ZTogc3RyaW5nO1xuICB0YXNrOiBUYXNrO1xuICBwYXRoOiBzdHJpbmc7XG59XG5cbi8qKiBNYXAgcmVtaW5kZXIgb2Zmc2V0IHRvIGRheXMgKi9cbmNvbnN0IFJFTUlOREVSX0RBWVM6IFJlY29yZDxSZW1pbmRlck9mZnNldCwgbnVtYmVyPiA9IHtcbiAgJzFkYXknOiAxLFxuICAnM2RheXMnOiAzLFxuICAnMXdlZWsnOiA3LFxufTtcblxuLyoqXG4gKiBTY2FuIGFsbCBkaWFyeSBmaWxlcywgY29sbGVjdCBpbmNvbXBsZXRlIHRhc2tzIGZyb20gZGF0ZXMgPD0gdG9kYXkuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRPdmVyZHVlVGFza3ModmF1bHQ6IFZhdWx0KTogUHJvbWlzZTxPdmVyZHVlVGFza1tdPiB7XG4gIGNvbnN0IGZpbGVzID0gc2NhbkRpYXJ5RmlsZXModmF1bHQpO1xuICBjb25zdCB0b2RheSA9IHRvZGF5U3RyKCk7XG4gIGNvbnN0IHJlc3VsdDogT3ZlcmR1ZVRhc2tbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgIGNvbnN0IGRhdGUgPSBmaWxlLm5hbWUucmVwbGFjZSgvXFwubWQkLywgJycpO1xuICAgIGlmIChkYXRlID4gdG9kYXkpIGNvbnRpbnVlO1xuXG4gICAgY29uc3QgY29udGVudCA9IGF3YWl0IHZhdWx0LmNhY2hlZFJlYWQoZmlsZSk7XG4gICAgY29uc3QgcGFyc2VkID0gcGFyc2VGcm9udG1hdHRlcihjb250ZW50KTtcbiAgICBpZiAoIXBhcnNlZCkgY29udGludWU7XG5cbiAgICBmb3IgKGNvbnN0IHRhc2sgb2YgcGFyc2VkLnRhc2tzKSB7XG4gICAgICBpZiAoIXRhc2suZG9uZSkge1xuICAgICAgICByZXN1bHQucHVzaCh7IGRhdGUsIHRhc2ssIHBhdGg6IGZpbGUucGF0aCB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIEdldCB0YXNrIGNvdW50cyBwZXIgZGF5IGZvciBjYWxlbmRhciBkb3QgaW5kaWNhdG9ycy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRhaWx5VGFza0NvdW50cyhcbiAgdmF1bHQ6IFZhdWx0LFxuICB5ZWFyOiBudW1iZXIsXG4gIG1vbnRoOiBudW1iZXJcbik6IFByb21pc2U8TWFwPG51bWJlciwgbnVtYmVyPj4ge1xuICBjb25zdCBwcmVmaXggPSBgJHt5ZWFyfS0ke1N0cmluZyhtb250aCArIDEpLnBhZFN0YXJ0KDIsICcwJyl9YDtcbiAgY29uc3QgZmlsZXMgPSBzY2FuRGlhcnlGaWxlcyh2YXVsdCkuZmlsdGVyKGYgPT4gZi5uYW1lLnN0YXJ0c1dpdGgocHJlZml4KSk7XG4gIGNvbnN0IG1hcCA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KCk7XG5cbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgY29uc3QgZGF5ID0gcGFyc2VJbnQoZmlsZS5uYW1lLnNsaWNlKDgsIDEwKSwgMTApO1xuICAgIGlmIChpc05hTihkYXkpKSBjb250aW51ZTtcbiAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdmF1bHQuY2FjaGVkUmVhZChmaWxlKTtcbiAgICBjb25zdCB0YXNrQ291bnQgPSAoY29udGVudC5tYXRjaCgvXFxuXFxzKy1cXHMraWQ6L2cpIHx8IFtdKS5sZW5ndGg7XG4gICAgaWYgKHRhc2tDb3VudCA+IDApIHtcbiAgICAgIG1hcC5zZXQoZGF5LCAobWFwLmdldChkYXkpIHx8IDApICsgdGFza0NvdW50KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbWFwO1xufVxuXG4vKiogRGF0YSBmb3IgYSByZW1pbmRlciB0aGF0IHNob3VsZCBmaXJlICovXG5leHBvcnQgaW50ZXJmYWNlIFJlbWluZGVyQWxlcnQge1xuICB0YXNrOiBUYXNrO1xuICBkYXRlOiBzdHJpbmc7XG4gIHBhdGg6IHN0cmluZztcbiAgb2Zmc2V0OiBSZW1pbmRlck9mZnNldDtcbiAgZGF5c1VudGlsOiBudW1iZXI7XG59XG5cbi8qKiBTZXQgb2YgYWxyZWFkeS1maXJlZCByZW1pbmRlciBrZXlzOiBcInRhc2tJZDpyZW1pbmRlck9mZnNldFwiICovXG5jb25zdCBmaXJlZFJlbWluZGVycyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4vKipcbiAqIENoZWNrIGFsbCB0YXNrcyBmb3IgZHVlIHJlbWluZGVycy4gUmV0dXJucyB0YXNrcyB3aG9zZSByZW1pbmRlciB0aHJlc2hvbGRcbiAqIGhhcyBiZWVuIHJlYWNoZWQuIEVhY2ggcmVtaW5kZXIgZmlyZXMgb25seSBvbmNlIHBlciBwbHVnaW4gc2Vzc2lvbi5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoZWNrUmVtaW5kZXJzKHZhdWx0OiBWYXVsdCk6IFByb21pc2U8UmVtaW5kZXJBbGVydFtdPiB7XG4gIGNvbnN0IGZpbGVzID0gc2NhbkRpYXJ5RmlsZXModmF1bHQpO1xuICBjb25zdCB0b2RheSA9IHRvZGF5U3RyKCk7XG4gIGNvbnN0IHRvZGF5RGF0ZSA9IG5ldyBEYXRlKHRvZGF5KTtcbiAgY29uc3QgYWxlcnRzOiBSZW1pbmRlckFsZXJ0W10gPSBbXTtcblxuICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdmF1bHQuY2FjaGVkUmVhZChmaWxlKTtcbiAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUZyb250bWF0dGVyKGNvbnRlbnQpO1xuICAgIGlmICghcGFyc2VkKSBjb250aW51ZTtcblxuICAgIGZvciAoY29uc3QgdGFzayBvZiBwYXJzZWQudGFza3MpIHtcbiAgICAgIGlmICh0YXNrLmRvbmUpIGNvbnRpbnVlO1xuICAgICAgaWYgKCF0YXNrLmRlYWRsaW5lIHx8ICF0YXNrLnJlbWluZGVyKSBjb250aW51ZTtcblxuICAgICAgY29uc3QgcmVtaW5kZXJLZXkgPSBgJHt0YXNrLmlkfToke3Rhc2sucmVtaW5kZXJ9YDtcbiAgICAgIGlmIChmaXJlZFJlbWluZGVycy5oYXMocmVtaW5kZXJLZXkpKSBjb250aW51ZTtcblxuICAgICAgY29uc3QgZGVhZGxpbmVEYXRlID0gbmV3IERhdGUodGFzay5kZWFkbGluZSk7XG4gICAgICBjb25zdCBkYXlzVW50aWwgPSBNYXRoLmZsb29yKFxuICAgICAgICAoZGVhZGxpbmVEYXRlLmdldFRpbWUoKSAtIHRvZGF5RGF0ZS5nZXRUaW1lKCkpIC8gKDEwMDAgKiA2MCAqIDYwICogMjQpXG4gICAgICApO1xuXG4gICAgICBjb25zdCB0aHJlc2hvbGQgPSBSRU1JTkRFUl9EQVlTW3Rhc2sucmVtaW5kZXJdO1xuICAgICAgaWYgKGRheXNVbnRpbCA8PSB0aHJlc2hvbGQgJiYgZGF5c1VudGlsID49IDApIHtcbiAgICAgICAgYWxlcnRzLnB1c2goe1xuICAgICAgICAgIHRhc2ssXG4gICAgICAgICAgZGF0ZTogZmlsZS5uYW1lLnJlcGxhY2UoL1xcLm1kJC8sICcnKSxcbiAgICAgICAgICBwYXRoOiBmaWxlLnBhdGgsXG4gICAgICAgICAgb2Zmc2V0OiB0YXNrLnJlbWluZGVyLFxuICAgICAgICAgIGRheXNVbnRpbCxcbiAgICAgICAgfSk7XG4gICAgICAgIGZpcmVkUmVtaW5kZXJzLmFkZChyZW1pbmRlcktleSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGFsZXJ0cztcbn1cblxuLyoqXG4gKiBGaXJlIGEgc3lzdGVtIG5vdGlmaWNhdGlvbiBmb3IgYSByZW1pbmRlci5cbiAqIFVzZXMgdGhlIEVsZWN0cm9uIE5vdGlmaWNhdGlvbiBBUEkgYXZhaWxhYmxlIGluIE9ic2lkaWFuIGRlc2t0b3AuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaXJlUmVtaW5kZXJOb3RpZmljYXRpb24oYWxlcnQ6IFJlbWluZGVyQWxlcnQpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB3aGVuID0gYWxlcnQuZGF5c1VudGlsID09PSAwXG4gICAgICA/ICd0b2RheSdcbiAgICAgIDogYWxlcnQuZGF5c1VudGlsID09PSAxXG4gICAgICAgID8gJ3RvbW9ycm93J1xuICAgICAgICA6IGBpbiAke2FsZXJ0LmRheXNVbnRpbH0gZGF5c2A7XG5cbiAgICBjb25zdCB0aXRsZSA9IGBcdTIzRjAgVGFzayBSZW1pbmRlcmA7XG4gICAgY29uc3QgYm9keSA9IGBcIiR7YWxlcnQudGFzay50ZXh0fVwiIGlzIGR1ZSAke3doZW59ICgke2FsZXJ0LnRhc2suZGVhZGxpbmV9KWA7XG5cbiAgICBjb25zdCBuID0gbmV3IE5vdGlmaWNhdGlvbih0aXRsZSwge1xuICAgICAgYm9keSxcbiAgICAgIHNpbGVudDogZmFsc2UsXG4gICAgfSk7XG5cbiAgICBuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgLy8gT3BlbmluZyB0aGUgZmlsZSB3b3VsZCByZXF1aXJlIGFwcCByZWZlcmVuY2UgXHUyMDE0IHNraXAgZm9yIG5vd1xuICAgICAgbi5jbG9zZSgpO1xuICAgIH0pO1xuICB9IGNhdGNoIChfZSkge1xuICAgIC8vIE5vdGlmaWNhdGlvbiBBUEkgbm90IGF2YWlsYWJsZSBcdTIwMTQgc2lsZW50bHkgaWdub3JlXG4gIH1cbn1cblxuLyoqXG4gKiBSZXF1ZXN0IG5vdGlmaWNhdGlvbiBwZXJtaXNzaW9uIGlmIG5vdCBncmFudGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVxdWVzdE5vdGlmaWNhdGlvblBlcm1pc3Npb24oKTogdm9pZCB7XG4gIGlmICh0eXBlb2YgTm90aWZpY2F0aW9uID09PSAndW5kZWZpbmVkJykgcmV0dXJuO1xuICBpZiAoTm90aWZpY2F0aW9uLnBlcm1pc3Npb24gPT09ICdkZWZhdWx0Jykge1xuICAgIE5vdGlmaWNhdGlvbi5yZXF1ZXN0UGVybWlzc2lvbigpO1xuICB9XG59XG5cbi8qKlxuICogUmVzZXQgZmlyZWQgcmVtaW5kZXJzIChlLmcuLCB3aGVuIHBsdWdpbiByZWxvYWRzKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0UmVtaW5kZXJzKCk6IHZvaWQge1xuICBmaXJlZFJlbWluZGVycy5jbGVhcigpO1xufVxuIiwgImltcG9ydCB7IFZhdWx0LCBURmlsZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IFRhc2ssIFByb2plY3QsIHRvZGF5U3RyIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBzY2FuRGlhcnlGaWxlcyB9IGZyb20gJy4vc2Nhbm5lcic7XG5pbXBvcnQgeyBwYXJzZUZyb250bWF0dGVyLCBzZXJpYWxpemVGcm9udG1hdHRlciwgZW5zdXJlRnJvbnRtYXR0ZXIgfSBmcm9tICcuL3BhcnNlcic7XG5cbi8qKlxuICogRXh0cmFjdCBub3RlLWxldmVsIHRhZ3MgZnJvbSBZQU1MIGZyb250bWF0dGVyLlxuICogSGFuZGxlczogYHRhZ3M6IGZvb2AsIGB0YWdzOiBbYSwgYl1gLCBgdGFnczpcXG4gIC0gYVxcbiAgLSBiYCwgYHRhZzogZm9vYFxuICovXG5mdW5jdGlvbiBleHRyYWN0Tm90ZVRhZ3MoeWFtbEJsb2NrOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHRhZ3M6IHN0cmluZ1tdID0gW107XG5cbiAgLy8gVHJ5IGlubGluZSBhcnJheTogdGFnczogW2EsIGIsIGNdXG4gIGNvbnN0IGlubGluZUFycmF5ID0geWFtbEJsb2NrLm1hdGNoKC9edGFnczpcXHMqXFxbKFteXFxdXSspXFxdL20pO1xuICBpZiAoaW5saW5lQXJyYXkpIHtcbiAgICBmb3IgKGNvbnN0IHBhcnQgb2YgaW5saW5lQXJyYXlbMV0uc3BsaXQoJywnKSkge1xuICAgICAgY29uc3QgY2xlYW5lZCA9IHBhcnQudHJpbSgpLnJlcGxhY2UoL15cIiguKilcIiQvLCAnJDEnKS5yZXBsYWNlKC9eJyguKiknJC8sICckMScpO1xuICAgICAgaWYgKGNsZWFuZWQpIHRhZ3MucHVzaChjbGVhbmVkKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhZ3M7XG4gIH1cblxuICAvLyBUcnkgc2luZ2xlIGxpbmU6IHRhZ3M6IGZvb1xuICBjb25zdCBzaW5nbGVMaW5lID0geWFtbEJsb2NrLm1hdGNoKC9edGFnczpcXHMqXCI/KFteXCJcXG5cXFtcXF1dKylcIj9cXHMqJC9tKTtcbiAgaWYgKHNpbmdsZUxpbmUpIHtcbiAgICBjb25zdCB2YWwgPSBzaW5nbGVMaW5lWzFdLnRyaW0oKTtcbiAgICBpZiAodmFsICYmICF2YWwuc3RhcnRzV2l0aCgnLScpKSB7XG4gICAgICB0YWdzLnB1c2godmFsKTtcbiAgICAgIHJldHVybiB0YWdzO1xuICAgIH1cbiAgfVxuXG4gIC8vIFRyeSBtdWx0aS1saW5lIGxpc3Q6IHRhZ3M6XFxuICAtIGFcXG4gIC0gYlxuICBjb25zdCB0YWdzU2VjdGlvbiA9IHlhbWxCbG9jay5tYXRjaCgvXnRhZ3M6XFxzKlxcbihbXFxzXFxTXSo/KSg/PVxcblxcU3wkKS9tKTtcbiAgaWYgKHRhZ3NTZWN0aW9uKSB7XG4gICAgY29uc3QgdGFnTGluZXMgPSB0YWdzU2VjdGlvblsxXS5tYXRjaEFsbCgvXlxccyotXFxzKlwiPyhbXlwiXFxuXSspXCI/XFxzKiQvZ20pO1xuICAgIGZvciAoY29uc3QgbSBvZiB0YWdMaW5lcykge1xuICAgICAgdGFncy5wdXNoKG1bMV0udHJpbSgpKTtcbiAgICB9XG4gIH1cblxuICAvLyBBbHNvIGNoZWNrIGB0YWc6IHh4eGAgKHNpbmd1bGFyKVxuICBjb25zdCB0YWdNYXRjaCA9IHlhbWxCbG9jay5tYXRjaCgvXnRhZzpcXHMqXCI/KFteXCJcXG5dKylcIj9cXHMqJC9tKTtcbiAgaWYgKHRhZ01hdGNoKSB7XG4gICAgdGFncy5wdXNoKHRhZ01hdGNoWzFdLnRyaW0oKSk7XG4gIH1cblxuICByZXR1cm4gdGFncztcbn1cblxuLyoqXG4gKiBFeHRyYWN0IGlubGluZSB0YWdzIGZyb20gbm90ZSBib2R5LlxuICogTWF0Y2hlcyAjcHJvamVjdCwgI3Byb2plY3QvZm9vLCAjdGFnL3N1YnRhZyBldGMuXG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RCb2R5VGFncyhib2R5OiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHRhZ3M6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHJlID0gLyMoW1xcdy1dKyg/OlxcL1tcXHctXSspKikvZztcbiAgbGV0IG1hdGNoO1xuICB3aGlsZSAoKG1hdGNoID0gcmUuZXhlYyhib2R5KSkgIT09IG51bGwpIHtcbiAgICB0YWdzLnB1c2gobWF0Y2hbMV0pO1xuICB9XG4gIHJldHVybiB0YWdzO1xufVxuXG5mdW5jdGlvbiBpc1Byb2plY3RUYWcodGFnOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIHRhZyA9PT0gJ3Byb2plY3QnIHx8IHRhZy5zdGFydHNXaXRoKCdwcm9qZWN0LycpO1xufVxuXG5pbnRlcmZhY2UgVGFza0VudHJ5IHtcbiAgZGF0ZTogc3RyaW5nO1xuICB0YXNrOiBUYXNrO1xuICBub3RlUGF0aDogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0UHJvamVjdHModmF1bHQ6IFZhdWx0KTogUHJvbWlzZTxQcm9qZWN0W10+IHtcbiAgY29uc3QgZGlhcnlGaWxlcyA9IHNjYW5EaWFyeUZpbGVzKHZhdWx0KTtcbiAgY29uc3QgZGlhcnlQYXRocyA9IG5ldyBTZXQoZGlhcnlGaWxlcy5tYXAoZiA9PiBmLnBhdGgpKTtcbiAgY29uc3QgcHJvamVjdE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBUYXNrRW50cnlbXT4oKTtcblxuICAvLyBHZXQgYWxsIG1hcmtkb3duIGZpbGVzLCBwcm9jZXNzIGRpYXJ5IGZpbGVzIGZpcnN0XG4gIGNvbnN0IGFsbEZpbGVzID0gdmF1bHQuZ2V0TWFya2Rvd25GaWxlcygpO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NGaWxlKGZpbGU6IFRGaWxlLCBpc0RpYXJ5OiBib29sZWFuKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgY29udGVudCA9IGF3YWl0IHZhdWx0LmNhY2hlZFJlYWQoZmlsZSk7XG4gICAgY29uc3QgcGFyc2VkID0gcGFyc2VGcm9udG1hdHRlcihjb250ZW50KTtcbiAgICBpZiAoIXBhcnNlZCkgcmV0dXJuO1xuXG4gICAgY29uc3QgZGF0ZSA9IGZpbGUubmFtZS5yZXBsYWNlKC9cXC5tZCQvLCAnJyk7XG4gICAgY29uc3Qgbm90ZVByb2plY3RUYWdzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICAvLyBGcm9tIHRhc2sgdGFnc1xuICAgIGZvciAoY29uc3QgdGFzayBvZiBwYXJzZWQudGFza3MpIHtcbiAgICAgIGZvciAoY29uc3QgdGFnIG9mIHRhc2sudGFncykge1xuICAgICAgICBpZiAoaXNQcm9qZWN0VGFnKHRhZykpIG5vdGVQcm9qZWN0VGFncy5hZGQodGFnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBGcm9tIG5vdGUtbGV2ZWwgZnJvbnRtYXR0ZXIgdGFnc1xuICAgIGNvbnN0IGZtTWF0Y2ggPSBjb250ZW50Lm1hdGNoKC9eLS0tXFxuKFtcXHNcXFNdKj8pXFxuLS0tLyk7XG4gICAgaWYgKGZtTWF0Y2gpIHtcbiAgICAgIGZvciAoY29uc3QgdGFnIG9mIGV4dHJhY3ROb3RlVGFncyhmbU1hdGNoWzFdKSkge1xuICAgICAgICBpZiAoaXNQcm9qZWN0VGFnKHRhZykpIG5vdGVQcm9qZWN0VGFncy5hZGQodGFnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBGcm9tIGJvZHkgaW5saW5lIHRhZ3NcbiAgICBmb3IgKGNvbnN0IHRhZyBvZiBleHRyYWN0Qm9keVRhZ3MocGFyc2VkLmJvZHkpKSB7XG4gICAgICBpZiAoaXNQcm9qZWN0VGFnKHRhZykpIG5vdGVQcm9qZWN0VGFncy5hZGQodGFnKTtcbiAgICB9XG5cbiAgICAvLyBBc3NvY2lhdGUgdGFza3MgdG8gcHJvamVjdHNcbiAgICBmb3IgKGNvbnN0IHByb2plY3RUYWcgb2Ygbm90ZVByb2plY3RUYWdzKSB7XG4gICAgICBjb25zdCBuYW1lID0gcHJvamVjdFRhZy5yZXBsYWNlKCdwcm9qZWN0LycsICcnKTtcbiAgICAgIGlmICghcHJvamVjdE1hcC5oYXMobmFtZSkpIHByb2plY3RNYXAuc2V0KG5hbWUsIFtdKTtcblxuICAgICAgaWYgKHBhcnNlZC50YXNrcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGZvciAoY29uc3QgdGFzayBvZiBwYXJzZWQudGFza3MpIHtcbiAgICAgICAgICBjb25zdCBleGlzdGluZyA9IHByb2plY3RNYXAuZ2V0KG5hbWUpITtcbiAgICAgICAgICBpZiAoIWV4aXN0aW5nLnNvbWUoZSA9PiBlLnRhc2suaWQgPT09IHRhc2suaWQpKSB7XG4gICAgICAgICAgICBleGlzdGluZy5wdXNoKHsgZGF0ZSwgdGFzaywgbm90ZVBhdGg6IGZpbGUucGF0aCB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBQcm9jZXNzIGRpYXJ5IGZpbGVzXG4gIGZvciAoY29uc3QgZmlsZSBvZiBkaWFyeUZpbGVzKSB7XG4gICAgYXdhaXQgcHJvY2Vzc0ZpbGUoZmlsZSwgdHJ1ZSk7XG4gIH1cblxuICAvLyBQcm9jZXNzIG5vbi1kaWFyeSBmaWxlcyB0aGF0IG1pZ2h0IGhhdmUgcHJvamVjdCB0YWdzXG4gIGZvciAoY29uc3QgZmlsZSBvZiBhbGxGaWxlcykge1xuICAgIGlmICghZGlhcnlQYXRocy5oYXMoZmlsZS5wYXRoKSkge1xuICAgICAgYXdhaXQgcHJvY2Vzc0ZpbGUoZmlsZSwgZmFsc2UpO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHByb2plY3RzOiBQcm9qZWN0W10gPSBbXTtcbiAgZm9yIChjb25zdCBbbmFtZSwgZW50cmllc10gb2YgcHJvamVjdE1hcCkge1xuICAgIGlmIChlbnRyaWVzLmxlbmd0aCA9PT0gMCkgY29udGludWU7XG4gICAgY29uc3QgZGF0ZXMgPSBlbnRyaWVzLm1hcChlID0+IGUuZGF0ZSkuZmlsdGVyKEJvb2xlYW4pLnNvcnQoKTtcbiAgICBjb25zdCBkb25lQ291bnQgPSBlbnRyaWVzLmZpbHRlcihlID0+IGUudGFzay5kb25lKS5sZW5ndGg7XG4gICAgY29uc3QgdGFza1dpdGhEZWFkbGluZSA9IGVudHJpZXMuZmluZChlID0+IGUudGFzay5kZWFkbGluZSk7XG5cbiAgICBwcm9qZWN0cy5wdXNoKHtcbiAgICAgIG5hbWUsXG4gICAgICB0YWc6IGBwcm9qZWN0LyR7bmFtZX1gLFxuICAgICAgdGFza3M6IGVudHJpZXMsXG4gICAgICBzdGFydERhdGU6IGRhdGVzWzBdIHx8IHRvZGF5U3RyKCksXG4gICAgICBlbmREYXRlOiB0YXNrV2l0aERlYWRsaW5lPy50YXNrLmRlYWRsaW5lIHx8IGRhdGVzW2RhdGVzLmxlbmd0aCAtIDFdIHx8IHRvZGF5U3RyKCksXG4gICAgICBkb25lQ291bnQsXG4gICAgICB0b3RhbENvdW50OiBlbnRyaWVzLmxlbmd0aCxcbiAgICB9KTtcbiAgfVxuXG4gIHByb2plY3RzLnNvcnQoKGEsIGIpID0+IGEuc3RhcnREYXRlLmxvY2FsZUNvbXBhcmUoYi5zdGFydERhdGUpKTtcbiAgcmV0dXJuIHByb2plY3RzO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlUHJvamVjdChcbiAgdmF1bHQ6IFZhdWx0LFxuICBuYW1lOiBzdHJpbmcsXG4gIHN0YXJ0RGF0ZTogc3RyaW5nLFxuICBlbmREYXRlOiBzdHJpbmdcbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB0YXNrOiBUYXNrID0ge1xuICAgIGlkOiBjcnlwdG8ucmFuZG9tVVVJRCgpLFxuICAgIHRleHQ6IGBQcm9qZWN0IHN0YXJ0OiAke25hbWV9YCxcbiAgICBkb25lOiBmYWxzZSxcbiAgICBwcmlvcml0eTogJ2hpZ2gnLFxuICAgIHRhZ3M6IFtgcHJvamVjdC8ke25hbWV9YF0sXG4gICAgZGVhZGxpbmU6IGVuZERhdGUsXG4gIH07XG5cbiAgY29uc3QgcGF0aCA9IGBcdTY1RTVcdThCQjAvJHtzdGFydERhdGV9Lm1kYDtcbiAgY29uc3QgZmlsZSA9IHZhdWx0LmdldEZpbGVCeVBhdGgocGF0aCk7XG5cbiAgaWYgKCFmaWxlKSB7XG4gICAgY29uc3QgY29udGVudCA9IHNlcmlhbGl6ZUZyb250bWF0dGVyKFxuICAgICAgW3Rhc2tdLFxuICAgICAgYCMgJHtuYW1lfVxcblxcbkZyb20gJHtzdGFydERhdGV9IHRvICR7ZW5kRGF0ZX1cXG5cXG5cXGBcXGBcXGBtZW1vLWdhbnR0XFxucHJvamVjdDogJHtuYW1lfVxcblxcYFxcYFxcYGBcbiAgICApO1xuICAgIGF3YWl0IHZhdWx0LmNyZWF0ZShwYXRoLCBjb250ZW50KTtcbiAgfSBlbHNlIHtcbiAgICBhd2FpdCB2YXVsdC5wcm9jZXNzKGZpbGUsIChjb250ZW50KSA9PiB7XG4gICAgICBjb25zdCB3aXRoRm0gPSBlbnN1cmVGcm9udG1hdHRlcihjb250ZW50KTtcbiAgICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlRnJvbnRtYXR0ZXIod2l0aEZtKTtcbiAgICAgIGNvbnN0IHRhc2tzID0gcGFyc2VkPy50YXNrcyA/PyBbXTtcbiAgICAgIHRhc2tzLnB1c2godGFzayk7XG4gICAgICBjb25zdCBib2R5ID0gcGFyc2VkPy5ib2R5ID8/ICcnO1xuICAgICAgY29uc3QgdXBkYXRlZCA9IGVuc3VyZUZyb250bWF0dGVyKHNlcmlhbGl6ZUZyb250bWF0dGVyKHRhc2tzLCBib2R5KSk7XG4gICAgICBjb25zdCB0YWdMaW5lID0gYHByb2plY3QvJHtuYW1lfWA7XG4gICAgICBpZiAoIXVwZGF0ZWQuaW5jbHVkZXModGFnTGluZSkpIHtcbiAgICAgICAgcmV0dXJuIHVwZGF0ZWQucmVwbGFjZSgvXi0tLVxcbi8sIGAtLS1cXG50YWdzOlxcbiAgLSBcIiR7dGFnTGluZX1cIlxcbmApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVwZGF0ZWQ7XG4gICAgfSk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBWYXVsdCB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IFByb2plY3QsIHRvZGF5U3RyIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBnZXRQcm9qZWN0cyB9IGZyb20gJy4vcHJvamVjdE1hbmFnZXInO1xuXG4vKiogUmVuZGVyIGEgR2FudHQgY2hhcnQgaW50byBhIGNvbnRhaW5lciBlbGVtZW50ICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVuZGVyR2FudHRDaGFydChcbiAgY29udGFpbmVyOiBIVE1MRWxlbWVudCxcbiAgdmF1bHQ6IFZhdWx0LFxuICBwcm9qZWN0RmlsdGVyPzogc3RyaW5nXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgYWxsUHJvamVjdHMgPSBhd2FpdCBnZXRQcm9qZWN0cyh2YXVsdCk7XG4gIGNvbnN0IHByb2plY3RzID0gcHJvamVjdEZpbHRlclxuICAgID8gYWxsUHJvamVjdHMuZmlsdGVyKHAgPT4gcC5uYW1lID09PSBwcm9qZWN0RmlsdGVyIHx8IHAudGFnID09PSBwcm9qZWN0RmlsdGVyKVxuICAgIDogYWxsUHJvamVjdHM7XG5cbiAgaWYgKHByb2plY3RzLmxlbmd0aCA9PT0gMCkge1xuICAgIGNvbnRhaW5lci5jcmVhdGVEaXYoJ21jLWVtcHR5LXN0YXRlJykuc2V0VGV4dChcbiAgICAgIHByb2plY3RGaWx0ZXIgPyBgTm8gcHJvamVjdCBcIiR7cHJvamVjdEZpbHRlcn1cIiBmb3VuZC5gIDogJ05vIHByb2plY3RzIHRvIGNoYXJ0LidcbiAgICApO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIENvbXB1dGUgZGF0ZSByYW5nZSBhY3Jvc3MgYWxsIHByb2plY3RzXG4gIGNvbnN0IHRvZGF5ID0gdG9kYXlTdHIoKTtcbiAgbGV0IG1pbkRhdGUgPSB0b2RheTtcbiAgbGV0IG1heERhdGUgPSB0b2RheTtcblxuICBmb3IgKGNvbnN0IHAgb2YgcHJvamVjdHMpIHtcbiAgICBpZiAocC5zdGFydERhdGUgPCBtaW5EYXRlKSBtaW5EYXRlID0gcC5zdGFydERhdGU7XG4gICAgaWYgKHAuZW5kRGF0ZSA+IG1heERhdGUpIG1heERhdGUgPSBwLmVuZERhdGU7XG4gIH1cblxuICAvLyBFbnN1cmUgYXQgbGVhc3QgMTQgZGF5cyByYW5nZVxuICBjb25zdCBtaW5EID0gbmV3IERhdGUobWluRGF0ZSk7XG4gIGNvbnN0IG1heEQgPSBuZXcgRGF0ZShtYXhEYXRlKTtcbiAgY29uc3QgcmFuZ2VEYXlzID0gTWF0aC5tYXgoXG4gICAgKG1heEQuZ2V0VGltZSgpIC0gbWluRC5nZXRUaW1lKCkpIC8gKDEwMDAgKiA2MCAqIDYwICogMjQpICsgMSxcbiAgICAxNFxuICApO1xuXG4gIC8vIFBhZCBlbmQgZGF0ZVxuICBjb25zdCBwYWRkZWRFbmQgPSBuZXcgRGF0ZShtaW5EKTtcbiAgcGFkZGVkRW5kLnNldERhdGUocGFkZGVkRW5kLmdldERhdGUoKSArIHJhbmdlRGF5cyk7XG4gIGNvbnN0IGVuZFN0ciA9IHBhZGRlZEVuZC50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKTtcblxuICBjb25zdCBjaGFydCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoJ21jLWdhbnR0LWNoYXJ0Jyk7XG5cbiAgLy8gSGVhZGVyIHJvdyB3aXRoIG1vbnRoIGxhYmVsc1xuICBjb25zdCBoZWFkZXJSb3cgPSBjaGFydC5jcmVhdGVEaXYoJ21jLWdhbnR0LWhlYWRlci1yb3cnKTtcbiAgaGVhZGVyUm93LmNyZWF0ZURpdignbWMtZ2FudHQtbGFiZWwtY29sJykuc2V0VGV4dCgnUHJvamVjdCcpO1xuXG4gIGNvbnN0IHRpbWVsaW5lSGVhZGVyID0gaGVhZGVyUm93LmNyZWF0ZURpdignbWMtZ2FudHQtdGltZWxpbmUtY29sJyk7XG4gIGNvbnN0IHRvdGFsRGF5cyA9IHJhbmdlRGF5cztcbiAgY29uc3QgZGF5V2lkdGggPSBNYXRoLm1heCgyNCwgTWF0aC5mbG9vcig2MDAgLyB0b3RhbERheXMpKTtcblxuICAvLyBUb2RheSBpbmRpY2F0b3IgcG9zaXRpb25cbiAgY29uc3QgdG9kYXlQb3MgPSBNYXRoLmZsb29yKFxuICAgIChuZXcgRGF0ZSh0b2RheSkuZ2V0VGltZSgpIC0gbWluRC5nZXRUaW1lKCkpIC8gKDEwMDAgKiA2MCAqIDYwICogMjQpXG4gICk7XG5cbiAgLy8gRGF5IGxhYmVscyAoc2hvdyBldmVyeSBmZXcgZGF5cylcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b3RhbERheXM7IGkrKykge1xuICAgIGNvbnN0IGQgPSBuZXcgRGF0ZShtaW5EKTtcbiAgICBkLnNldERhdGUoZC5nZXREYXRlKCkgKyBpKTtcbiAgICBjb25zdCBsYWJlbCA9IGQuZ2V0RGF0ZSgpID09PSAxIHx8IGkgPT09IDAgfHwgaSA9PT0gdG90YWxEYXlzIC0gMVxuICAgICAgPyBgJHtkLmdldE1vbnRoKCkgKyAxfS8ke2QuZ2V0RGF0ZSgpfWBcbiAgICAgIDogKGQuZ2V0RGF0ZSgpICUgNSA9PT0gMCA/IFN0cmluZyhkLmdldERhdGUoKSkgOiAnJyk7XG5cbiAgICBjb25zdCBkYXlDZWxsID0gdGltZWxpbmVIZWFkZXIuY3JlYXRlRGl2KCdtYy1nYW50dC1kYXktY2VsbCcpO1xuICAgIGRheUNlbGwuc2V0VGV4dChsYWJlbCk7XG4gICAgZGF5Q2VsbC5zdHlsZS53aWR0aCA9IGAke2RheVdpZHRofXB4YDtcbiAgfVxuXG4gIC8vIFRvZGF5IG1hcmtlciBsaW5lXG4gIGNvbnN0IG1hcmtlckxpbmUgPSBjaGFydC5jcmVhdGVEaXYoJ21jLWdhbnR0LXRvZGF5LW1hcmtlcicpO1xuICBtYXJrZXJMaW5lLnN0eWxlLmxlZnQgPSBgY2FsYygxMjBweCArICR7dG9kYXlQb3MgKiBkYXlXaWR0aH1weClgO1xuICBtYXJrZXJMaW5lLmNyZWF0ZURpdignbWMtZ2FudHQtdG9kYXktbGFiZWwnKS5zZXRUZXh0KCdUb2RheScpO1xuXG4gIC8vIFByb2plY3Qgcm93c1xuICBmb3IgKGNvbnN0IHByb2plY3Qgb2YgcHJvamVjdHMpIHtcbiAgICBjb25zdCByb3cgPSBjaGFydC5jcmVhdGVEaXYoJ21jLWdhbnR0LXJvdycpO1xuXG4gICAgLy8gTGFiZWxcbiAgICBjb25zdCBsYWJlbENvbCA9IHJvdy5jcmVhdGVEaXYoJ21jLWdhbnR0LWxhYmVsLWNvbCcpO1xuICAgIGNvbnN0IHBjdCA9IHByb2plY3QudG90YWxDb3VudCA+IDBcbiAgICAgID8gTWF0aC5yb3VuZCgocHJvamVjdC5kb25lQ291bnQgLyBwcm9qZWN0LnRvdGFsQ291bnQpICogMTAwKVxuICAgICAgOiAwO1xuICAgIGxhYmVsQ29sLmNyZWF0ZVNwYW4oeyB0ZXh0OiBwcm9qZWN0Lm5hbWUsIGNsczogJ21jLWdhbnR0LXByb2plY3QtbmFtZScgfSk7XG4gICAgbGFiZWxDb2wuY3JlYXRlU3Bhbih7IHRleHQ6IGAke3BjdH0lYCwgY2xzOiAnbWMtZ2FudHQtcHJvamVjdC1wY3QnIH0pO1xuXG4gICAgLy8gQmFyIGFyZWFcbiAgICBjb25zdCBiYXJBcmVhID0gcm93LmNyZWF0ZURpdignbWMtZ2FudHQtdGltZWxpbmUtY29sJyk7XG5cbiAgICBjb25zdCBwcm9qU3RhcnQgPSBuZXcgRGF0ZShwcm9qZWN0LnN0YXJ0RGF0ZSk7XG4gICAgY29uc3QgcHJvakVuZCA9IG5ldyBEYXRlKHByb2plY3QuZW5kRGF0ZSk7XG5cbiAgICBjb25zdCBzdGFydE9mZnNldCA9IE1hdGgubWF4KDAsXG4gICAgICBNYXRoLmZsb29yKChwcm9qU3RhcnQuZ2V0VGltZSgpIC0gbWluRC5nZXRUaW1lKCkpIC8gKDEwMDAgKiA2MCAqIDYwICogMjQpKVxuICAgICk7XG4gICAgY29uc3QgZHVyYXRpb24gPSBNYXRoLm1heCgxLFxuICAgICAgTWF0aC5jZWlsKChwcm9qRW5kLmdldFRpbWUoKSAtIHByb2pTdGFydC5nZXRUaW1lKCkpIC8gKDEwMDAgKiA2MCAqIDYwICogMjQpKSArIDFcbiAgICApO1xuXG4gICAgY29uc3QgYmFyID0gYmFyQXJlYS5jcmVhdGVEaXYoJ21jLWdhbnR0LWJhcicpO1xuICAgIGJhci5zdHlsZS5tYXJnaW5MZWZ0ID0gYCR7c3RhcnRPZmZzZXQgKiBkYXlXaWR0aH1weGA7XG4gICAgYmFyLnN0eWxlLndpZHRoID0gYCR7ZHVyYXRpb24gKiBkYXlXaWR0aCAtIDR9cHhgO1xuXG4gICAgaWYgKHBjdCA9PT0gMTAwKSB7XG4gICAgICBiYXIuYWRkQ2xhc3MoJ21jLWdhbnR0LWJhci1kb25lJyk7XG4gICAgfSBlbHNlIGlmIChwcm9qZWN0LnRhc2tzLnNvbWUodCA9PiB0LmRhdGUgPCB0b2RheSAmJiAhdC50YXNrLmRvbmUpKSB7XG4gICAgICBiYXIuYWRkQ2xhc3MoJ21jLWdhbnR0LWJhci1vdmVyZHVlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJhci5hZGRDbGFzcygnbWMtZ2FudHQtYmFyLW9udHJhY2snKTtcbiAgICB9XG5cbiAgICAvLyBCYXIgbGFiZWxcbiAgICBiYXIuc2V0VGV4dChgJHtwcm9qZWN0LnN0YXJ0RGF0ZX0gXHUyMTkyICR7cHJvamVjdC5lbmREYXRlfWApO1xuXG4gICAgLy8gRGVhZGxpbmUgbWFya2VyIGlmIHNldFxuICAgIGNvbnN0IHRhc2tXaXRoRGVhZGxpbmUgPSBwcm9qZWN0LnRhc2tzLmZpbmQodCA9PiB0LnRhc2suZGVhZGxpbmUpO1xuICAgIGlmICh0YXNrV2l0aERlYWRsaW5lPy50YXNrLmRlYWRsaW5lKSB7XG4gICAgICBjb25zdCBkbERhdGUgPSBuZXcgRGF0ZSh0YXNrV2l0aERlYWRsaW5lLnRhc2suZGVhZGxpbmUpO1xuICAgICAgY29uc3QgZGxPZmZzZXQgPSBNYXRoLmZsb29yKFxuICAgICAgICAoZGxEYXRlLmdldFRpbWUoKSAtIG1pbkQuZ2V0VGltZSgpKSAvICgxMDAwICogNjAgKiA2MCAqIDI0KVxuICAgICAgKTtcbiAgICAgIGNvbnN0IGRsTWFya2VyID0gYmFyQXJlYS5jcmVhdGVEaXYoJ21jLWdhbnR0LWRlYWRsaW5lJyk7XG4gICAgICBkbE1hcmtlci5zdHlsZS5tYXJnaW5MZWZ0ID0gYCR7ZGxPZmZzZXQgKiBkYXlXaWR0aCAtIDR9cHhgO1xuICAgICAgZGxNYXJrZXIuc2V0QXR0cigndGl0bGUnLCBgRGVhZGxpbmU6ICR7dGFza1dpdGhEZWFkbGluZS50YXNrLmRlYWRsaW5lfWApO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFBhcnNlIGNvZGUgYmxvY2sgY29udGVudCBmb3IgR2FudHQgY2hhcnQgcGFyYW1ldGVycy5cbiAqIFN1cHBvcnRlZDogYHByb2plY3Q6IDxuYW1lPmAgdG8gZmlsdGVyIGJ5IHByb2plY3QgbmFtZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlR2FudHRCbG9jayhzb3VyY2U6IHN0cmluZyk6IHsgcHJvamVjdD86IHN0cmluZyB9IHtcbiAgY29uc3QgcmVzdWx0OiB7IHByb2plY3Q/OiBzdHJpbmcgfSA9IHt9O1xuICBmb3IgKGNvbnN0IGxpbmUgb2Ygc291cmNlLnNwbGl0KCdcXG4nKSkge1xuICAgIGNvbnN0IG0gPSBsaW5lLm1hdGNoKC9ecHJvamVjdDpcXHMqKC4rKSQvKTtcbiAgICBpZiAobSkge1xuICAgICAgcmVzdWx0LnByb2plY3QgPSBtWzFdLnRyaW0oKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBQUFBLG1CQUFzQzs7O0FDQXRDLElBQUFDLG1CQUF1RDs7O0FDcUNoRCxJQUFNLHFC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
