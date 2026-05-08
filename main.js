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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL0NhbGVuZGFyVmlldy50cyIsICJzcmMvdHlwZXMudHMiLCAic3JjL3NjYW5uZXIudHMiLCAic3JjL3BhcnNlci50cyIsICJzcmMvdGFza01hbmFnZXIudHMiLCAic3JjL3JlbWluZGVyLnRzIiwgInNyYy9wcm9qZWN0TWFuYWdlci50cyIsICJzcmMvR2FudHRDaGFydC50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgUGx1Z2luLCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgQ2FsZW5kYXJWaWV3LCBWSUVXX1RZUEVfQ0FMRU5EQVIgfSBmcm9tICcuL0NhbGVuZGFyVmlldyc7XG5pbXBvcnQgeyBlbnN1cmVEaWFyeUZvbGRlciB9IGZyb20gJy4vc2Nhbm5lcic7XG5pbXBvcnQgeyByZW5kZXJHYW50dENoYXJ0LCBwYXJzZUdhbnR0QmxvY2sgfSBmcm9tICcuL0dhbnR0Q2hhcnQnO1xuaW1wb3J0IHsgY2hlY2tSZW1pbmRlcnMsIGZpcmVSZW1pbmRlck5vdGlmaWNhdGlvbiwgcmVxdWVzdE5vdGlmaWNhdGlvblBlcm1pc3Npb24sIHJlc2V0UmVtaW5kZXJzIH0gZnJvbSAnLi9yZW1pbmRlcic7XG5cbmNvbnN0IFJFTUlOREVSX0lOVEVSVkFMX01TID0gNSAqIDYwICogMTAwMDsgLy8gY2hlY2sgZXZlcnkgNSBtaW51dGVzXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1lbW9DYWxlbmRhclBsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHByaXZhdGUgcmVtaW5kZXJJbnRlcnZhbDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG5cbiAgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IGVuc3VyZURpYXJ5Rm9sZGVyKHRoaXMuYXBwLnZhdWx0KTtcblxuICAgIHRoaXMucmVnaXN0ZXJWaWV3KFxuICAgICAgVklFV19UWVBFX0NBTEVOREFSLFxuICAgICAgKGxlYWY6IFdvcmtzcGFjZUxlYWYpID0+IG5ldyBDYWxlbmRhclZpZXcobGVhZiwgdGhpcy5hcHAudmF1bHQpXG4gICAgKTtcblxuICAgIHRoaXMuYWRkUmliYm9uSWNvbignY2FsZW5kYXItZGF5cycsICdPcGVuIE1lbW8gQ2FsZW5kYXInLCAoKSA9PiB7XG4gICAgICB0aGlzLmFjdGl2YXRlVmlldygpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiAnb3Blbi1tZW1vLWNhbGVuZGFyJyxcbiAgICAgIG5hbWU6ICdPcGVuIE1lbW8gQ2FsZW5kYXInLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuYWN0aXZhdGVWaWV3KCksXG4gICAgfSk7XG5cbiAgICAvLyBSZWdpc3RlciBjb2RlIGJsb2NrIHByb2Nlc3NvciBmb3IgbWVtby1nYW50dFxuICAgIHRoaXMucmVnaXN0ZXJNYXJrZG93bkNvZGVCbG9ja1Byb2Nlc3NvcignbWVtby1nYW50dCcsIGFzeW5jIChzb3VyY2UsIGVsKSA9PiB7XG4gICAgICBjb25zdCBwYXJhbXMgPSBwYXJzZUdhbnR0QmxvY2soc291cmNlKTtcbiAgICAgIGF3YWl0IHJlbmRlckdhbnR0Q2hhcnQoZWwsIHRoaXMuYXBwLnZhdWx0LCBwYXJhbXMucHJvamVjdCk7XG4gICAgfSk7XG5cbiAgICAvLyBSZXF1ZXN0IHN5c3RlbSBub3RpZmljYXRpb24gcGVybWlzc2lvblxuICAgIHJlcXVlc3ROb3RpZmljYXRpb25QZXJtaXNzaW9uKCk7XG5cbiAgICAvLyBTdGFydCByZW1pbmRlciBjaGVja2VyXG4gICAgdGhpcy5zdGFydFJlbWluZGVyQ2hlY2soKTtcbiAgfVxuXG4gIGFzeW5jIG9udW5sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc3RvcFJlbWluZGVyQ2hlY2soKTtcbiAgICByZXNldFJlbWluZGVycygpO1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5kZXRhY2hMZWF2ZXNPZlR5cGUoVklFV19UWVBFX0NBTEVOREFSKTtcbiAgfVxuXG4gIGFzeW5jIGFjdGl2YXRlVmlldygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHA7XG5cbiAgICBjb25zdCBleGlzdGluZyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVklFV19UWVBFX0NBTEVOREFSKTtcbiAgICBpZiAoZXhpc3RpbmcubGVuZ3RoID4gMCkge1xuICAgICAgd29ya3NwYWNlLnJldmVhbExlYWYoZXhpc3RpbmdbMF0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGxlYWYgPSB3b3Jrc3BhY2UuZ2V0TGVhZih0cnVlKTtcbiAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IFZJRVdfVFlQRV9DQUxFTkRBUiwgYWN0aXZlOiB0cnVlIH0pO1xuICAgIHdvcmtzcGFjZS5yZXZlYWxMZWFmKGxlYWYpO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGFydFJlbWluZGVyQ2hlY2soKTogdm9pZCB7XG4gICAgLy8gUnVuIGltbWVkaWF0ZWx5IG9uIHN0YXJ0dXBcbiAgICB0aGlzLnJ1blJlbWluZGVyQ2hlY2soKTtcbiAgICAvLyBUaGVuIHBvbGwgYXQgaW50ZXJ2YWxcbiAgICB0aGlzLnJlbWluZGVySW50ZXJ2YWwgPSB3aW5kb3cuc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgdGhpcy5ydW5SZW1pbmRlckNoZWNrKCk7XG4gICAgfSwgUkVNSU5ERVJfSU5URVJWQUxfTVMpO1xuICAgIHRoaXMucmVnaXN0ZXJJbnRlcnZhbCh0aGlzLnJlbWluZGVySW50ZXJ2YWwpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBydW5SZW1pbmRlckNoZWNrKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBhbGVydHMgPSBhd2FpdCBjaGVja1JlbWluZGVycyh0aGlzLmFwcC52YXVsdCk7XG4gICAgICBmb3IgKGNvbnN0IGFsZXJ0IG9mIGFsZXJ0cykge1xuICAgICAgICBmaXJlUmVtaW5kZXJOb3RpZmljYXRpb24oYWxlcnQpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKF9lKSB7XG4gICAgICAvLyBTaWxlbnRseSBpZ25vcmUgcmVtaW5kZXIgY2hlY2sgZmFpbHVyZXNcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHN0b3BSZW1pbmRlckNoZWNrKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnJlbWluZGVySW50ZXJ2YWwgIT09IG51bGwpIHtcbiAgICAgIHdpbmRvdy5jbGVhckludGVydmFsKHRoaXMucmVtaW5kZXJJbnRlcnZhbCk7XG4gICAgICB0aGlzLnJlbWluZGVySW50ZXJ2YWwgPSBudWxsO1xuICAgIH1cbiAgfVxufVxuIiwgImltcG9ydCB7IEl0ZW1WaWV3LCBXb3Jrc3BhY2VMZWFmLCBWYXVsdCwgTm90aWNlIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgVklFV19UWVBFX0NBTEVOREFSLCBDYWxlbmRhclN0YXRlLCBQUklPUklUWV9DT0xPUlMsIHRvZGF5U3RyLCBUYXNrLCBWaWV3TW9kZSwgUHJvamVjdCwgUmVtaW5kZXJPZmZzZXQgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IFRhc2tNYW5hZ2VyIH0gZnJvbSAnLi90YXNrTWFuYWdlcic7XG5pbXBvcnQgeyBkaWFyeVBhdGggfSBmcm9tICcuL3NjYW5uZXInO1xuaW1wb3J0IHsgZ2V0T3ZlcmR1ZVRhc2tzLCBkYWlseVRhc2tDb3VudHMsIE92ZXJkdWVUYXNrIH0gZnJvbSAnLi9yZW1pbmRlcic7XG5pbXBvcnQgeyBnZXRQcm9qZWN0cywgY3JlYXRlUHJvamVjdCB9IGZyb20gJy4vcHJvamVjdE1hbmFnZXInO1xuaW1wb3J0IHsgcmVuZGVyR2FudHRDaGFydCB9IGZyb20gJy4vR2FudHRDaGFydCc7XG5cbmV4cG9ydCB7IFZJRVdfVFlQRV9DQUxFTkRBUiB9O1xuXG5leHBvcnQgY2xhc3MgQ2FsZW5kYXJWaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xuICBwcml2YXRlIHN0YXRlOiBDYWxlbmRhclN0YXRlO1xuICBwcml2YXRlIHRhc2tNYW5hZ2VyOiBUYXNrTWFuYWdlcjtcbiAgcHJpdmF0ZSBvdmVyZHVlVGFza3M6IE92ZXJkdWVUYXNrW10gPSBbXTtcbiAgcHJpdmF0ZSB2aWV3TW9kZTogVmlld01vZGU7XG5cbiAgY29uc3RydWN0b3IobGVhZjogV29ya3NwYWNlTGVhZiwgdmF1bHQ6IFZhdWx0KSB7XG4gICAgc3VwZXIobGVhZik7XG4gICAgdGhpcy50YXNrTWFuYWdlciA9IG5ldyBUYXNrTWFuYWdlcih2YXVsdCk7XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgY3VycmVudFllYXI6IG5vdy5nZXRGdWxsWWVhcigpLFxuICAgICAgY3VycmVudE1vbnRoOiBub3cuZ2V0TW9udGgoKSxcbiAgICAgIHNlbGVjdGVkRGF0ZTogdG9kYXlTdHIoKSxcbiAgICB9O1xuICAgIHRoaXMudmlld01vZGUgPSAnY2FsZW5kYXInO1xuICB9XG5cbiAgZ2V0Vmlld1R5cGUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gVklFV19UWVBFX0NBTEVOREFSO1xuICB9XG5cbiAgZ2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ01lbW8gQ2FsZW5kYXInO1xuICB9XG5cbiAgZ2V0SWNvbigpOiBzdHJpbmcge1xuICAgIHJldHVybiAnY2FsZW5kYXItZGF5cyc7XG4gIH1cblxuICBhc3luYyBvbk9wZW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5yZWZyZXNoKCk7XG4gIH1cblxuICBhc3luYyByZWZyZXNoKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuY29udGVudEVsO1xuICAgIGNvbnRhaW5lci5lbXB0eSgpO1xuXG4gICAgY29uc3QgdmF1bHQgPSAodGhpcy5hcHAgYXMgYW55KS52YXVsdCBhcyBWYXVsdDtcbiAgICB0aGlzLm92ZXJkdWVUYXNrcyA9IGF3YWl0IGdldE92ZXJkdWVUYXNrcyh2YXVsdCk7XG5cbiAgICBjb25zdCB3cmFwcGVyID0gY29udGFpbmVyLmNyZWF0ZURpdignbWMtd3JhcHBlcicpO1xuXG4gICAgdGhpcy5yZW5kZXJIZWFkZXIod3JhcHBlcik7XG5cbiAgICBpZiAodGhpcy52aWV3TW9kZSA9PT0gJ2NhbGVuZGFyJykge1xuICAgICAgY29uc3QgYm9keSA9IHdyYXBwZXIuY3JlYXRlRGl2KCdtYy1ib2R5Jyk7XG4gICAgICBjb25zdCBsZWZ0UGFuZWwgPSBib2R5LmNyZWF0ZURpdignbWMtbGVmdC1wYW5lbCcpO1xuICAgICAgYXdhaXQgdGhpcy5yZW5kZXJDYWxlbmRhckdyaWQobGVmdFBhbmVsKTtcbiAgICAgIGNvbnN0IHJpZ2h0UGFuZWwgPSBib2R5LmNyZWF0ZURpdignbWMtcmlnaHQtcGFuZWwnKTtcbiAgICAgIGF3YWl0IHRoaXMucmVuZGVyRGF5RGV0YWlsKHJpZ2h0UGFuZWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCB0aGlzLnJlbmRlclByb2plY3RzVmlldyh3cmFwcGVyKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnJlbmRlclJlbWluZGVyQmFubmVyKHdyYXBwZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJIZWFkZXIoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IGhlYWRlciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoJ21jLWhlYWRlcicpO1xuICAgIGNvbnN0IHByZXYgPSBoZWFkZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ1x1MjVDMCcsIGNsczogJ21jLW5hdi1idG4nIH0pO1xuICAgIGNvbnN0IHRpdGxlID0gaGVhZGVyLmNyZWF0ZURpdignbWMtdGl0bGUnKTtcbiAgICB0aGlzLnVwZGF0ZVRpdGxlKHRpdGxlKTtcbiAgICBjb25zdCBuZXh0ID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICdcdTI1QjYnLCBjbHM6ICdtYy1uYXYtYnRuJyB9KTtcblxuICAgIHByZXYuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICBpZiAodGhpcy5zdGF0ZS5jdXJyZW50TW9udGggPT09IDApIHtcbiAgICAgICAgdGhpcy5zdGF0ZS5jdXJyZW50TW9udGggPSAxMTtcbiAgICAgICAgdGhpcy5zdGF0ZS5jdXJyZW50WWVhci0tO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zdGF0ZS5jdXJyZW50TW9udGgtLTtcbiAgICAgIH1cbiAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgIH0pO1xuXG4gICAgbmV4dC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIGlmICh0aGlzLnN0YXRlLmN1cnJlbnRNb250aCA9PT0gMTEpIHtcbiAgICAgICAgdGhpcy5zdGF0ZS5jdXJyZW50TW9udGggPSAwO1xuICAgICAgICB0aGlzLnN0YXRlLmN1cnJlbnRZZWFyKys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnN0YXRlLmN1cnJlbnRNb250aCsrO1xuICAgICAgfVxuICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgfSk7XG5cbiAgICBjb25zdCB0b2RheUJ0biA9IGhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnVG9kYXknLCBjbHM6ICdtYy10b2RheS1idG4nIH0pO1xuICAgIHRvZGF5QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgIHRoaXMuc3RhdGUuY3VycmVudFllYXIgPSBub3cuZ2V0RnVsbFllYXIoKTtcbiAgICAgIHRoaXMuc3RhdGUuY3VycmVudE1vbnRoID0gbm93LmdldE1vbnRoKCk7XG4gICAgICB0aGlzLnN0YXRlLnNlbGVjdGVkRGF0ZSA9IHRvZGF5U3RyKCk7XG4gICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICB9KTtcblxuICAgIC8vIFZpZXcgbW9kZSB0b2dnbGVcbiAgICBjb25zdCB0b2dnbGVDb250YWluZXIgPSBoZWFkZXIuY3JlYXRlRGl2KCdtYy12aWV3LXRvZ2dsZScpO1xuICAgIGNvbnN0IGNhbEJ0biA9IHRvZ2dsZUNvbnRhaW5lci5jcmVhdGVFbCgnYnV0dG9uJywge1xuICAgICAgdGV4dDogJ0NhbGVuZGFyJyxcbiAgICAgIGNsczogdGhpcy52aWV3TW9kZSA9PT0gJ2NhbGVuZGFyJyA/ICdtYy10b2dnbGUtYnRuIG1jLXRvZ2dsZS1hY3RpdmUnIDogJ21jLXRvZ2dsZS1idG4nLFxuICAgIH0pO1xuICAgIGNvbnN0IHByb2pCdG4gPSB0b2dnbGVDb250YWluZXIuY3JlYXRlRWwoJ2J1dHRvbicsIHtcbiAgICAgIHRleHQ6ICdQcm9qZWN0cycsXG4gICAgICBjbHM6IHRoaXMudmlld01vZGUgPT09ICdwcm9qZWN0cycgPyAnbWMtdG9nZ2xlLWJ0biBtYy10b2dnbGUtYWN0aXZlJyA6ICdtYy10b2dnbGUtYnRuJyxcbiAgICB9KTtcblxuICAgIGNhbEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHRoaXMudmlld01vZGUgPSAnY2FsZW5kYXInO1xuICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgfSk7XG4gICAgcHJvakJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHRoaXMudmlld01vZGUgPSAncHJvamVjdHMnO1xuICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZVRpdGxlKGVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IG1vbnRocyA9IFsnSmFudWFyeScsJ0ZlYnJ1YXJ5JywnTWFyY2gnLCdBcHJpbCcsJ01heScsJ0p1bmUnLFxuICAgICAgICAgICAgICAgICAgICAnSnVseScsJ0F1Z3VzdCcsJ1NlcHRlbWJlcicsJ09jdG9iZXInLCdOb3ZlbWJlcicsJ0RlY2VtYmVyJ107XG4gICAgZWwuc2V0VGV4dChgJHttb250aHNbdGhpcy5zdGF0ZS5jdXJyZW50TW9udGhdfSAke3RoaXMuc3RhdGUuY3VycmVudFllYXJ9YCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlbmRlckNhbGVuZGFyR3JpZChjb250YWluZXI6IEhUTUxFbGVtZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZ3JpZCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoJ21jLWNhbGVuZGFyLWdyaWQnKTtcblxuICAgIGNvbnN0IGRheU5hbWVzID0gWydNb24nLCAnVHVlJywgJ1dlZCcsICdUaHUnLCAnRnJpJywgJ1NhdCcsICdTdW4nXTtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgZGF5TmFtZXMpIHtcbiAgICAgIGdyaWQuY3JlYXRlRGl2KCdtYy1kYXktaGVhZGVyJykuc2V0VGV4dChuYW1lKTtcbiAgICB9XG5cbiAgICBjb25zdCB5ZWFyID0gdGhpcy5zdGF0ZS5jdXJyZW50WWVhcjtcbiAgICBjb25zdCBtb250aCA9IHRoaXMuc3RhdGUuY3VycmVudE1vbnRoO1xuICAgIGNvbnN0IGZpcnN0RGF5ID0gbmV3IERhdGUoeWVhciwgbW9udGgsIDEpLmdldERheSgpO1xuICAgIGNvbnN0IGRheXNJbk1vbnRoID0gbmV3IERhdGUoeWVhciwgbW9udGggKyAxLCAwKS5nZXREYXRlKCk7XG4gICAgY29uc3QgcHJldk1vbnRoRGF5cyA9IG5ldyBEYXRlKHllYXIsIG1vbnRoLCAwKS5nZXREYXRlKCk7XG5cbiAgICBjb25zdCB0YXNrQ291bnRzID0gYXdhaXQgZGFpbHlUYXNrQ291bnRzKCh0aGlzLmFwcCBhcyBhbnkpLnZhdWx0IGFzIFZhdWx0LCB5ZWFyLCBtb250aCk7XG4gICAgY29uc3Qgb3ZlcmR1ZURhdGVzID0gbmV3IFNldChcbiAgICAgIHRoaXMub3ZlcmR1ZVRhc2tzLmZpbHRlcih0ID0+IHQuZGF0ZS5zdGFydHNXaXRoKFxuICAgICAgICBgJHt5ZWFyfS0ke1N0cmluZyhtb250aCArIDEpLnBhZFN0YXJ0KDIsICcwJyl9YFxuICAgICAgKSkubWFwKHQgPT4gdC5kYXRlLnNsaWNlKDgpKVxuICAgICk7XG5cbiAgICBjb25zdCB0b2RheSA9IHRvZGF5U3RyKCk7XG5cbiAgICBjb25zdCBzdGFydE9mZnNldCA9IGZpcnN0RGF5ID09PSAwID8gNiA6IGZpcnN0RGF5IC0gMTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RhcnRPZmZzZXQ7IGkrKykge1xuICAgICAgY29uc3QgZGF5ID0gcHJldk1vbnRoRGF5cyAtIHN0YXJ0T2Zmc2V0ICsgaSArIDE7XG4gICAgICBjb25zdCBjZWxsID0gZ3JpZC5jcmVhdGVEaXYoJ21jLWRheS1jZWxsIG1jLWRheS1vdGhlcicpO1xuICAgICAgY2VsbC5jcmVhdGVEaXYoJ21jLWRheS1udW0nKS5zZXRUZXh0KFN0cmluZyhkYXkpKTtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBkYXkgPSAxOyBkYXkgPD0gZGF5c0luTW9udGg7IGRheSsrKSB7XG4gICAgICBjb25zdCBkYXRlU3RyID0gYCR7eWVhcn0tJHtTdHJpbmcobW9udGggKyAxKS5wYWRTdGFydCgyLCAnMCcpfS0ke1N0cmluZyhkYXkpLnBhZFN0YXJ0KDIsICcwJyl9YDtcbiAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBkYXRlU3RyID09PSB0aGlzLnN0YXRlLnNlbGVjdGVkRGF0ZTtcbiAgICAgIGNvbnN0IGlzVG9kYXkgPSBkYXRlU3RyID09PSB0b2RheTtcblxuICAgICAgY29uc3QgY2VsbCA9IGdyaWQuY3JlYXRlRGl2KCdtYy1kYXktY2VsbCcpO1xuICAgICAgaWYgKGlzU2VsZWN0ZWQpIGNlbGwuYWRkQ2xhc3MoJ21jLWRheS1zZWxlY3RlZCcpO1xuICAgICAgaWYgKGlzVG9kYXkpIGNlbGwuYWRkQ2xhc3MoJ21jLWRheS10b2RheScpO1xuXG4gICAgICBjb25zdCBudW1FbCA9IGNlbGwuY3JlYXRlRGl2KCdtYy1kYXktbnVtJyk7XG4gICAgICBudW1FbC5zZXRUZXh0KFN0cmluZyhkYXkpKTtcblxuICAgICAgY29uc3QgY291bnQgPSB0YXNrQ291bnRzLmdldChkYXkpO1xuICAgICAgaWYgKGNvdW50ICYmIGNvdW50ID4gMCkge1xuICAgICAgICBjb25zdCBkb3RzID0gY2VsbC5jcmVhdGVEaXYoJ21jLWRheS1kb3RzJyk7XG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgTWF0aC5taW4oY291bnQsIDMpOyBqKyspIHtcbiAgICAgICAgICBkb3RzLmNyZWF0ZURpdignbWMtZG90Jyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvdW50ID4gMykge1xuICAgICAgICAgIGRvdHMuY3JlYXRlU3Bhbih7IGNsczogJ21jLWRvdC1tb3JlJywgdGV4dDogYCske2NvdW50IC0gM31gIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChvdmVyZHVlRGF0ZXMuaGFzKFN0cmluZyhkYXkpKSkge1xuICAgICAgICBjZWxsLmNyZWF0ZURpdignbWMtb3ZlcmR1ZS1kb3QnKTtcbiAgICAgIH1cblxuICAgICAgY2VsbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgdGhpcy5zdGF0ZS5zZWxlY3RlZERhdGUgPSBkYXRlU3RyO1xuICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgIH0pO1xuXG4gICAgICBjZWxsLnNldEF0dHIoJ3RhYmluZGV4JywgJzAnKTtcbiAgICAgIGNlbGwuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIChlKSA9PiB7XG4gICAgICAgIGlmIChlLmtleSA9PT0gJ0VudGVyJykge1xuICAgICAgICAgIHRoaXMuc3RhdGUuc2VsZWN0ZWREYXRlID0gZGF0ZVN0cjtcbiAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgdG90YWxDZWxscyA9IHN0YXJ0T2Zmc2V0ICsgZGF5c0luTW9udGg7XG4gICAgY29uc3QgcmVtYWluaW5nQ2VsbHMgPSB0b3RhbENlbGxzICUgNyA9PT0gMCA/IDAgOiA3IC0gKHRvdGFsQ2VsbHMgJSA3KTtcbiAgICBmb3IgKGxldCBkYXkgPSAxOyBkYXkgPD0gcmVtYWluaW5nQ2VsbHM7IGRheSsrKSB7XG4gICAgICBjb25zdCBjZWxsID0gZ3JpZC5jcmVhdGVEaXYoJ21jLWRheS1jZWxsIG1jLWRheS1vdGhlcicpO1xuICAgICAgY2VsbC5jcmVhdGVEaXYoJ21jLWRheS1udW0nKS5zZXRUZXh0KFN0cmluZyhkYXkpKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlbmRlckRheURldGFpbChjb250YWluZXI6IEhUTUxFbGVtZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdmF1bHQgPSAodGhpcy5hcHAgYXMgYW55KS52YXVsdCBhcyBWYXVsdDtcbiAgICBjb25zdCBkYXRlID0gdGhpcy5zdGF0ZS5zZWxlY3RlZERhdGUgfHwgdG9kYXlTdHIoKTtcbiAgICBjb25zdCBkYXlEYXRhID0gYXdhaXQgdGhpcy50YXNrTWFuYWdlci5nZXREYXkoZGF0ZSk7XG5cbiAgICBjb250YWluZXIuZW1wdHkoKTtcblxuICAgIGNvbnN0IGRhdGVIZWFkZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KCdtYy1kYXRlLWhlYWRlcicpO1xuICAgIGNvbnN0IGQgPSBuZXcgRGF0ZShkYXlEYXRhLmRhdGUpO1xuICAgIGNvbnN0IHdlZWtkYXlzID0gWydTdW5kYXknLCdNb25kYXknLCdUdWVzZGF5JywnV2VkbmVzZGF5JywnVGh1cnNkYXknLCdGcmlkYXknLCdTYXR1cmRheSddO1xuICAgIGNvbnN0IG1vbnRocyA9IFsnSmFudWFyeScsJ0ZlYnJ1YXJ5JywnTWFyY2gnLCdBcHJpbCcsJ01heScsJ0p1bmUnLFxuICAgICAgICAgICAgICAgICAgICAnSnVseScsJ0F1Z3VzdCcsJ1NlcHRlbWJlcicsJ09jdG9iZXInLCdOb3ZlbWJlcicsJ0RlY2VtYmVyJ107XG4gICAgZGF0ZUhlYWRlci5jcmVhdGVEaXYoJ21jLWRhdGUtdGl0bGUnKS5zZXRUZXh0KGAke21vbnRoc1tkLmdldE1vbnRoKCldfSAke2QuZ2V0RGF0ZSgpfSwgJHtkLmdldEZ1bGxZZWFyKCl9YCk7XG4gICAgZGF0ZUhlYWRlci5jcmVhdGVEaXYoJ21jLWRhdGUtd2Vla2RheScpLnNldFRleHQod2Vla2RheXNbZC5nZXREYXkoKV0pO1xuXG4gICAgY29uc3QgdGFza1NlY3Rpb24gPSBjb250YWluZXIuY3JlYXRlRGl2KCdtYy10YXNrLXNlY3Rpb24nKTtcbiAgICBjb25zdCB0YXNrSGVhZGVyID0gdGFza1NlY3Rpb24uY3JlYXRlRGl2KCdtYy1zZWN0aW9uLWhlYWRlcicpO1xuICAgIHRhc2tIZWFkZXIuY3JlYXRlU3Bhbih7IHRleHQ6ICdUYXNrcycsIGNsczogJ21jLXNlY3Rpb24tbGFiZWwnIH0pO1xuXG4gICAgY29uc3QgYWRkQnRuID0gdGFza0hlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnKycsIGNsczogJ21jLWFkZC1idG4nIH0pO1xuICAgIGFkZEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHRoaXMuc2hvd0FkZFRhc2tPdmVybGF5KHRhc2tTZWN0aW9uLCBkYXRlKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IHRhc2tMaXN0ID0gdGFza1NlY3Rpb24uY3JlYXRlRGl2KCdtYy10YXNrLWxpc3QnKTtcblxuICAgIGlmIChkYXlEYXRhLnRhc2tzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGFza0xpc3QuY3JlYXRlRGl2KCdtYy1lbXB0eS1zdGF0ZScpLnNldFRleHQoJ05vIHRhc2tzIGZvciB0aGlzIGRheS4gQ2xpY2sgKyB0byBhZGQuJyk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCB0YXNrIG9mIGRheURhdGEudGFza3MpIHtcbiAgICAgIGNvbnN0IHRhc2tFbCA9IHRhc2tMaXN0LmNyZWF0ZURpdignbWMtdGFzay1pdGVtJyk7XG4gICAgICBpZiAodGFzay5kb25lKSB0YXNrRWwuYWRkQ2xhc3MoJ21jLXRhc2stZG9uZScpO1xuXG4gICAgICBjb25zdCBjaGVja2JveCA9IHRhc2tFbC5jcmVhdGVEaXYoJ21jLWNoZWNrYm94Jyk7XG4gICAgICBpZiAodGFzay5kb25lKSBjaGVja2JveC5hZGRDbGFzcygnbWMtY2hlY2tib3gtY2hlY2tlZCcpO1xuICAgICAgY2hlY2tib3guYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBhc3luYyAoZSkgPT4ge1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBjb25zdCBuZXdEb25lID0gIXRhc2suZG9uZTtcbiAgICAgICAgdGFzay5kb25lID0gbmV3RG9uZTtcbiAgICAgICAgaWYgKG5ld0RvbmUpIHtcbiAgICAgICAgICBjaGVja2JveC5hZGRDbGFzcygnbWMtY2hlY2tib3gtY2hlY2tlZCcpO1xuICAgICAgICAgIHRhc2tFbC5hZGRDbGFzcygnbWMtdGFzay1kb25lJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2hlY2tib3gucmVtb3ZlQ2xhc3MoJ21jLWNoZWNrYm94LWNoZWNrZWQnKTtcbiAgICAgICAgICB0YXNrRWwucmVtb3ZlQ2xhc3MoJ21jLXRhc2stZG9uZScpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMudGFza01hbmFnZXIudXBkYXRlVGFzayhkYXRlLCB0YXNrLmlkLCB7IGRvbmU6IG5ld0RvbmUgfSk7XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcHJpb3JpdHlEb3QgPSB0YXNrRWwuY3JlYXRlRGl2KCdtYy1wcmlvcml0eS1kb3QnKTtcbiAgICAgIHByaW9yaXR5RG90LnN0eWxlLmJhY2tncm91bmRDb2xvciA9IFBSSU9SSVRZX0NPTE9SU1t0YXNrLnByaW9yaXR5XTtcblxuICAgICAgY29uc3QgdGV4dEVsID0gdGFza0VsLmNyZWF0ZVNwYW4oeyB0ZXh0OiB0YXNrLnRleHQsIGNsczogJ21jLXRhc2stdGV4dCcgfSk7XG5cbiAgICAgIGlmICh0YXNrLmRlYWRsaW5lKSB7XG4gICAgICAgIGNvbnN0IGRsID0gdGFza0VsLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgXHUyM0YwICR7dGFzay5kZWFkbGluZX1gLCBjbHM6ICdtYy10YXNrLWRlYWRsaW5lJyB9KTtcbiAgICAgIH1cbiAgICAgIGlmICh0YXNrLnJlbWluZGVyKSB7XG4gICAgICAgIGNvbnN0IHJlbWluZGVyTGFiZWxzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyAnMWRheSc6ICdcdUQ4M0RcdUREMTQxZCcsICczZGF5cyc6ICdcdUQ4M0RcdUREMTQzZCcsICcxd2Vlayc6ICdcdUQ4M0RcdUREMTQxdycgfTtcbiAgICAgICAgdGFza0VsLmNyZWF0ZVNwYW4oeyB0ZXh0OiByZW1pbmRlckxhYmVsc1t0YXNrLnJlbWluZGVyXSB8fCAnJywgY2xzOiAnbWMtdGFzay1yZW1pbmRlcicgfSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRlbGV0ZUJ0biA9IHRhc2tFbC5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnXHUwMEQ3JywgY2xzOiAnbWMtZGVsZXRlLWJ0bicgfSk7XG4gICAgICBkZWxldGVCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGF3YWl0IHRoaXMudGFza01hbmFnZXIuZGVsZXRlVGFzayhkYXRlLCB0YXNrLmlkKTtcbiAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb250YWluZXIuY3JlYXRlRGl2KCdtYy1kaXZpZGVyJyk7XG5cbiAgICBjb25zdCBib2R5U2VjdGlvbiA9IGNvbnRhaW5lci5jcmVhdGVEaXYoJ21jLWJvZHktc2VjdGlvbicpO1xuICAgIGNvbnN0IGJvZHlIZWFkZXIgPSBib2R5U2VjdGlvbi5jcmVhdGVEaXYoJ21jLXNlY3Rpb24taGVhZGVyJyk7XG4gICAgYm9keUhlYWRlci5jcmVhdGVTcGFuKHsgdGV4dDogJ1dvcmsgTG9nJywgY2xzOiAnbWMtc2VjdGlvbi1sYWJlbCcgfSk7XG5cbiAgICBjb25zdCBuZXdQcm9qQnRuID0gYm9keUhlYWRlci5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnK1Byb2plY3QnLCBjbHM6ICdtYy1wcm9qLWJ0bicgfSk7XG4gICAgbmV3UHJvakJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIHRoaXMuc2hvd0FkZFByb2plY3RPdmVybGF5KGJvZHlTZWN0aW9uLCBkYXRlKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IG9wZW5CdG4gPSBib2R5SGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICdFZGl0JywgY2xzOiAnbWMtZWRpdC1idG4nIH0pO1xuICAgIG9wZW5CdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICBjb25zdCBwYXRoID0gZGlhcnlQYXRoKGRhdGUpO1xuICAgICAgY29uc3QgZmlsZSA9IHZhdWx0LmdldEZpbGVCeVBhdGgocGF0aCk7XG4gICAgICBpZiAoZmlsZSkge1xuICAgICAgICAodGhpcy5hcHAgYXMgYW55KS53b3Jrc3BhY2UuZ2V0TGVhZigpLm9wZW5GaWxlKGZpbGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgKHRoaXMuYXBwIGFzIGFueSkud29ya3NwYWNlLm9wZW5MaW5rVGV4dChkYXRlLCAnXHU2NUU1XHU4QkIwLycsIHRydWUpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKGRheURhdGEuYm9keS50cmltKCkpIHtcbiAgICAgIGNvbnN0IGJvZHlDb250ZW50ID0gYm9keVNlY3Rpb24uY3JlYXRlRGl2KCdtYy1ib2R5LWNvbnRlbnQnKTtcbiAgICAgIGNvbnN0IHJlbmRlcmVkID0gZGF5RGF0YS5ib2R5XG4gICAgICAgIC5yZXBsYWNlKC9cXFtcXFsoW15cXF1dKylcXF1cXF0vZywgJzxhIGNsYXNzPVwibWMtd2lraWxpbmtcIiBocmVmPVwiI1wiPiQxPC9hPicpXG4gICAgICAgIC5yZXBsYWNlKC9cXG4vZywgJzxicj4nKTtcbiAgICAgIGJvZHlDb250ZW50LmlubmVySFRNTCA9IHJlbmRlcmVkO1xuXG4gICAgICBib2R5Q29udGVudC5xdWVyeVNlbGVjdG9yQWxsKCcubWMtd2lraWxpbmsnKS5mb3JFYWNoKGxpbmsgPT4ge1xuICAgICAgICBsaW5rLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgY29uc3Qgbm90ZU5hbWUgPSAobGluayBhcyBIVE1MRWxlbWVudCkudGV4dENvbnRlbnQgfHwgJyc7XG4gICAgICAgICAgKHRoaXMuYXBwIGFzIGFueSkud29ya3NwYWNlLm9wZW5MaW5rVGV4dChub3RlTmFtZSwgJycsIGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYm9keVNlY3Rpb24uY3JlYXRlRGl2KCdtYy1lbXB0eS1zdGF0ZScpLnNldFRleHQoJ05vIHdvcmsgbG9nIHlldC4gT3BlbiB0aGlzIGZpbGUgaW4gT2JzaWRpYW4gdG8gd3JpdGUuJyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZW5kZXJQcm9qZWN0c1ZpZXcoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHZhdWx0ID0gKHRoaXMuYXBwIGFzIGFueSkudmF1bHQgYXMgVmF1bHQ7XG4gICAgY29uc3QgcHJvamVjdHMgPSBhd2FpdCBnZXRQcm9qZWN0cyh2YXVsdCk7XG5cbiAgICBjb25zdCBib2R5ID0gY29udGFpbmVyLmNyZWF0ZURpdignbWMtcHJvamVjdHMtYm9keScpO1xuXG4gICAgY29uc3QgaGVhZGVyID0gYm9keS5jcmVhdGVEaXYoJ21jLXNlY3Rpb24taGVhZGVyJyk7XG4gICAgaGVhZGVyLmNyZWF0ZVNwYW4oeyB0ZXh0OiAnQWN0aXZlIFByb2plY3RzJywgY2xzOiAnbWMtc2VjdGlvbi1sYWJlbCcgfSk7XG5cbiAgICBjb25zdCBhZGRQcm9qQnRuID0gaGVhZGVyLmNyZWF0ZUVsKCdidXR0b24nLCB7IHRleHQ6ICcrIE5ldycsIGNsczogJ21jLWFkZC1idG4nIH0pO1xuICAgIGFkZFByb2pCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLnNob3dBZGRQcm9qZWN0T3ZlcmxheShib2R5LCB0b2RheVN0cigpKTtcbiAgICB9KTtcblxuICAgIGlmIChwcm9qZWN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgIGJvZHkuY3JlYXRlRGl2KCdtYy1lbXB0eS1zdGF0ZScpLnNldFRleHQoXG4gICAgICAgICdObyBwcm9qZWN0cyB5ZXQuIEFkZCAjcHJvamVjdC94eHggdGFncyB0byB5b3VyIHRhc2tzLCBvciBjbGljayArIE5ldy4nXG4gICAgICApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgcHJvamVjdCBvZiBwcm9qZWN0cykge1xuICAgICAgY29uc3QgY2FyZCA9IGJvZHkuY3JlYXRlRGl2KCdtYy1wcm9qZWN0LWNhcmQnKTtcbiAgICAgIGNvbnN0IGNhcmRIZWFkZXIgPSBjYXJkLmNyZWF0ZURpdignbWMtcHJvamVjdC1oZWFkZXInKTtcblxuICAgICAgY29uc3QgaW5mbyA9IGNhcmRIZWFkZXIuY3JlYXRlRGl2KCdtYy1wcm9qZWN0LWluZm8nKTtcbiAgICAgIGNvbnN0IHBjdCA9IHByb2plY3QudG90YWxDb3VudCA+IDBcbiAgICAgICAgPyBNYXRoLnJvdW5kKChwcm9qZWN0LmRvbmVDb3VudCAvIHByb2plY3QudG90YWxDb3VudCkgKiAxMDApXG4gICAgICAgIDogMDtcbiAgICAgIGluZm8uY3JlYXRlU3Bhbih7IHRleHQ6IHByb2plY3QubmFtZSwgY2xzOiAnbWMtcHJvamVjdC1uYW1lJyB9KTtcbiAgICAgIGluZm8uY3JlYXRlU3Bhbih7IHRleHQ6IGAke3BjdH0lYCwgY2xzOiAnbWMtcHJvamVjdC1wY3QnIH0pO1xuXG4gICAgICBjb25zdCB0YXNrV2l0aERlYWRsaW5lID0gcHJvamVjdC50YXNrcy5maW5kKHQgPT4gdC50YXNrLmRlYWRsaW5lKTtcbiAgICAgIGNvbnN0IGRhdGVUZXh0ID0gdGFza1dpdGhEZWFkbGluZT8udGFzay5kZWFkbGluZVxuICAgICAgICA/IGAke3Byb2plY3Quc3RhcnREYXRlfSBcdTIxOTIgJHt0YXNrV2l0aERlYWRsaW5lLnRhc2suZGVhZGxpbmV9IChkZWFkbGluZSlgXG4gICAgICAgIDogYCR7cHJvamVjdC5zdGFydERhdGV9IFx1MjE5MiAke3Byb2plY3QuZW5kRGF0ZX1gO1xuICAgICAgY29uc3QgZGF0ZVNwYW4gPSBjYXJkSGVhZGVyLmNyZWF0ZVNwYW4oe1xuICAgICAgICB0ZXh0OiBkYXRlVGV4dCxcbiAgICAgICAgY2xzOiAnbWMtcHJvamVjdC1kYXRlcycsXG4gICAgICB9KTtcblxuICAgICAgLy8gUHJvZ3Jlc3MgYmFyXG4gICAgICBjb25zdCBiYXIgPSBjYXJkLmNyZWF0ZURpdignbWMtcHJvZ3Jlc3MtYmFyJyk7XG4gICAgICBjb25zdCBmaWxsID0gYmFyLmNyZWF0ZURpdignbWMtcHJvZ3Jlc3MtZmlsbCcpO1xuICAgICAgZmlsbC5zdHlsZS53aWR0aCA9IGAke3BjdH0lYDtcblxuICAgICAgaWYgKHBjdCA9PT0gMTAwKSB7XG4gICAgICAgIGZpbGwuYWRkQ2xhc3MoJ21jLXByb2dyZXNzLWRvbmUnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvamVjdC50YXNrcy5zb21lKHQgPT4gdC5kYXRlIDwgdG9kYXlTdHIoKSAmJiAhdC50YXNrLmRvbmUpKSB7XG4gICAgICAgIGZpbGwuYWRkQ2xhc3MoJ21jLXByb2dyZXNzLW92ZXJkdWUnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZpbGwuYWRkQ2xhc3MoJ21jLXByb2dyZXNzLW9udHJhY2snKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGV0YWlscyA9IGNhcmQuY3JlYXRlRGl2KCdtYy1wcm9qZWN0LWRldGFpbHMnKTtcbiAgICAgIGRldGFpbHMuc2V0VGV4dChgJHtwcm9qZWN0LmRvbmVDb3VudH0vJHtwcm9qZWN0LnRvdGFsQ291bnR9IHRhc2tzIGRvbmVgKTtcblxuICAgICAgY29uc3Qgb3ZlcmR1ZUNvdW50ID0gcHJvamVjdC50YXNrcy5maWx0ZXIoXG4gICAgICAgIHQgPT4gdC5kYXRlIDwgdG9kYXlTdHIoKSAmJiAhdC50YXNrLmRvbmVcbiAgICAgICkubGVuZ3RoO1xuICAgICAgaWYgKG92ZXJkdWVDb3VudCA+IDApIHtcbiAgICAgICAgZGV0YWlscy5jcmVhdGVTcGFuKHsgdGV4dDogYCBcdTAwQjcgXHUyNkEwICR7b3ZlcmR1ZUNvdW50fSBvdmVyZHVlYCwgY2xzOiAnbWMtcHJvamVjdC13YXJuaW5nJyB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gRXhwYW5kIHRvIHNob3cgdGFza3NcbiAgICAgIGNhcmQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHRhc2tMaXN0ID0gY2FyZC5xdWVyeVNlbGVjdG9yKCcubWMtcHJvamVjdC10YXNrcycpO1xuICAgICAgICBpZiAodGFza0xpc3QpIHtcbiAgICAgICAgICAodGFza0xpc3QgYXMgSFRNTEVsZW1lbnQpLnN0eWxlLmRpc3BsYXkgPVxuICAgICAgICAgICAgKHRhc2tMaXN0IGFzIEhUTUxFbGVtZW50KS5zdHlsZS5kaXNwbGF5ID09PSAnbm9uZScgPyAnYmxvY2snIDogJ25vbmUnO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgdGFza0xpc3QgPSBjYXJkLmNyZWF0ZURpdignbWMtcHJvamVjdC10YXNrcycpO1xuICAgICAgdGFza0xpc3Quc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgIGNvbnN0IHNvcnRlZFRhc2tzID0gWy4uLnByb2plY3QudGFza3NdLnNvcnQoKGEsIGIpID0+IGEuZGF0ZS5sb2NhbGVDb21wYXJlKGIuZGF0ZSkpO1xuICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBzb3J0ZWRUYXNrcykge1xuICAgICAgICBjb25zdCByb3cgPSB0YXNrTGlzdC5jcmVhdGVEaXYoJ21jLXByb2plY3QtdGFzay1yb3cnKTtcbiAgICAgICAgY29uc3QgZG90ID0gcm93LmNyZWF0ZURpdignbWMtcHJpb3JpdHktZG90Jyk7XG4gICAgICAgIGRvdC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBlbnRyeS50YXNrLmRvbmUgPyAnIzZiY2Y3ZicgOlxuICAgICAgICAgIChlbnRyeS5kYXRlIDwgdG9kYXlTdHIoKSA/ICcjZmY2YjZiJyA6ICcjZmZkOTNkJyk7XG4gICAgICAgIHJvdy5jcmVhdGVTcGFuKHsgdGV4dDogZW50cnkuZGF0ZSwgY2xzOiAnbWMtcHJvamVjdC10YXNrLWRhdGUnIH0pO1xuICAgICAgICByb3cuY3JlYXRlU3Bhbih7XG4gICAgICAgICAgdGV4dDogZW50cnkudGFzay50ZXh0LFxuICAgICAgICAgIGNsczogZW50cnkudGFzay5kb25lID8gJ21jLXRhc2stZG9uZScgOiAnJyxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChlbnRyeS50YXNrLmRlYWRsaW5lKSB7XG4gICAgICAgICAgcm93LmNyZWF0ZVNwYW4oe1xuICAgICAgICAgICAgdGV4dDogYCAgXHUyM0YwICR7ZW50cnkudGFzay5kZWFkbGluZX1gLFxuICAgICAgICAgICAgY2xzOiAnbWMtcHJvamVjdC1kZWFkbGluZScsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBHYW50dCBjaGFydCBzZWN0aW9uXG4gICAgY29uc3QgZ2FudHRTZWN0aW9uID0gYm9keS5jcmVhdGVEaXYoJ21jLWdhbnR0LXNlY3Rpb24nKTtcbiAgICBjb25zdCBnYW50dEhlYWRlciA9IGdhbnR0U2VjdGlvbi5jcmVhdGVEaXYoJ21jLXNlY3Rpb24taGVhZGVyJyk7XG4gICAgZ2FudHRIZWFkZXIuY3JlYXRlU3Bhbih7IHRleHQ6ICdHYW50dCBDaGFydCcsIGNsczogJ21jLXNlY3Rpb24tbGFiZWwnIH0pO1xuICAgIGNvbnN0IGdhbnR0Q29udGFpbmVyID0gZ2FudHRTZWN0aW9uLmNyZWF0ZURpdignbWMtZ2FudHQtY29udGFpbmVyJyk7XG4gICAgYXdhaXQgcmVuZGVyR2FudHRDaGFydChnYW50dENvbnRhaW5lciwgdmF1bHQpO1xuICB9XG5cbiAgcHJpdmF0ZSBzaG93QWRkUHJvamVjdE92ZXJsYXkoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgc3RhcnREYXRlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBmb3JtID0gY29udGFpbmVyLmNyZWF0ZURpdignbWMtYWRkLXByb2plY3QtZm9ybScpO1xuXG4gICAgY29uc3QgdGl0bGUgPSBmb3JtLmNyZWF0ZURpdignbWMtZm9ybS10aXRsZScpO1xuICAgIHRpdGxlLnNldFRleHQoJ05ldyBQcm9qZWN0Jyk7XG5cbiAgICBjb25zdCBuYW1lSW5wdXQgPSBmb3JtLmNyZWF0ZUVsKCdpbnB1dCcsIHtcbiAgICAgIHR5cGU6ICd0ZXh0JyxcbiAgICAgIHBsYWNlaG9sZGVyOiAnUHJvamVjdCBuYW1lLi4uJyxcbiAgICAgIGNsczogJ21jLXRhc2staW5wdXQnLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZGF0ZVJvdyA9IGZvcm0uY3JlYXRlRGl2KCdtYy1kYXRlLXJvdycpO1xuICAgIGRhdGVSb3cuY3JlYXRlU3Bhbih7IHRleHQ6ICdTdGFydDonLCBjbHM6ICdtYy1kYXRlLWxhYmVsJyB9KTtcbiAgICBjb25zdCBzdGFydElucHV0ID0gZGF0ZVJvdy5jcmVhdGVFbCgnaW5wdXQnLCB7XG4gICAgICB0eXBlOiAnZGF0ZScsXG4gICAgICBjbHM6ICdtYy1kYXRlLWlucHV0JyxcbiAgICB9KTtcbiAgICBzdGFydElucHV0LnZhbHVlID0gc3RhcnREYXRlO1xuXG4gICAgZGF0ZVJvdy5jcmVhdGVTcGFuKHsgdGV4dDogJ0VuZDonLCBjbHM6ICdtYy1kYXRlLWxhYmVsJyB9KTtcbiAgICBjb25zdCBlbmRJbnB1dCA9IGRhdGVSb3cuY3JlYXRlRWwoJ2lucHV0Jywge1xuICAgICAgdHlwZTogJ2RhdGUnLFxuICAgICAgY2xzOiAnbWMtZGF0ZS1pbnB1dCcsXG4gICAgfSk7XG4gICAgY29uc3QgZW5kRGF0ZSA9IG5ldyBEYXRlKCk7XG4gICAgZW5kRGF0ZS5zZXREYXRlKGVuZERhdGUuZ2V0RGF0ZSgpICsgMTQpO1xuICAgIGVuZElucHV0LnZhbHVlID0gZW5kRGF0ZS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKTtcblxuICAgIGNvbnN0IGJ0blJvdyA9IGZvcm0uY3JlYXRlRGl2KCdtYy1mb3JtLWJ0bnMnKTtcbiAgICBjb25zdCBzdWJtaXRCdG4gPSBidG5Sb3cuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ0NyZWF0ZScsIGNsczogJ21jLXN1Ym1pdC1idG4nIH0pO1xuICAgIHN1Ym1pdEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGFzeW5jICgpID0+IHtcbiAgICAgIGlmIChuYW1lSW5wdXQudmFsdWUudHJpbSgpICYmIHN0YXJ0SW5wdXQudmFsdWUgJiYgZW5kSW5wdXQudmFsdWUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCB2YXVsdCA9ICh0aGlzLmFwcCBhcyBhbnkpLnZhdWx0IGFzIFZhdWx0O1xuICAgICAgICAgIGF3YWl0IGNyZWF0ZVByb2plY3QodmF1bHQsIG5hbWVJbnB1dC52YWx1ZS50cmltKCksIHN0YXJ0SW5wdXQudmFsdWUsIGVuZElucHV0LnZhbHVlKTtcbiAgICAgICAgICBmb3JtLnJlbW92ZSgpO1xuICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBuZXcgTm90aWNlKGBGYWlsZWQgdG8gY3JlYXRlIHByb2plY3Q6ICR7ZXJyfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBjYW5jZWxCdG4gPSBidG5Sb3cuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ0NhbmNlbCcsIGNsczogJ21jLWNhbmNlbC1idG4nIH0pO1xuICAgIGNhbmNlbEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IGZvcm0ucmVtb3ZlKCkpO1xuXG4gICAgbmFtZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBhc3luYyAoZSkgPT4ge1xuICAgICAgaWYgKGUua2V5ID09PSAnRW50ZXInICYmIG5hbWVJbnB1dC52YWx1ZS50cmltKCkgJiYgc3RhcnRJbnB1dC52YWx1ZSAmJiBlbmRJbnB1dC52YWx1ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHZhdWx0ID0gKHRoaXMuYXBwIGFzIGFueSkudmF1bHQgYXMgVmF1bHQ7XG4gICAgICAgICAgYXdhaXQgY3JlYXRlUHJvamVjdCh2YXVsdCwgbmFtZUlucHV0LnZhbHVlLnRyaW0oKSwgc3RhcnRJbnB1dC52YWx1ZSwgZW5kSW5wdXQudmFsdWUpO1xuICAgICAgICAgIGZvcm0ucmVtb3ZlKCk7XG4gICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIG5ldyBOb3RpY2UoYEZhaWxlZCB0byBjcmVhdGUgcHJvamVjdDogJHtlcnJ9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2hvd0FkZFRhc2tPdmVybGF5KGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGRhdGU6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IGZvcm0gPSBjb250YWluZXIuY3JlYXRlRGl2KCdtYy1hZGQtdGFzay1mb3JtJyk7XG4gICAgY29uc3QgaW5wdXRSb3cgPSBmb3JtLmNyZWF0ZURpdignbWMtdGFzay1pbnB1dC1yb3cnKTtcbiAgICBjb25zdCBpbnB1dCA9IGlucHV0Um93LmNyZWF0ZUVsKCdpbnB1dCcsIHtcbiAgICAgIHR5cGU6ICd0ZXh0JyxcbiAgICAgIHBsYWNlaG9sZGVyOiAnVGFzayBkZXNjcmlwdGlvbi4uLicsXG4gICAgICBjbHM6ICdtYy10YXNrLWlucHV0JyxcbiAgICB9KTtcbiAgICBjb25zdCBwcmlvcml0eVNlbGVjdCA9IGlucHV0Um93LmNyZWF0ZUVsKCdzZWxlY3QnLCB7IGNsczogJ21jLXByaW9yaXR5LXNlbGVjdCcgfSk7XG4gICAgcHJpb3JpdHlTZWxlY3QuaW5uZXJIVE1MID0gYFxuICAgICAgPG9wdGlvbiB2YWx1ZT1cIm1lZGl1bVwiPk1lZGl1bTwvb3B0aW9uPlxuICAgICAgPG9wdGlvbiB2YWx1ZT1cImhpZ2hcIj5IaWdoPC9vcHRpb24+XG4gICAgICA8b3B0aW9uIHZhbHVlPVwibG93XCI+TG93PC9vcHRpb24+XG4gICAgYDtcblxuICAgIGNvbnN0IGRlYWRsaW5lUm93ID0gZm9ybS5jcmVhdGVEaXYoJ21jLWRlYWRsaW5lLXJvdycpO1xuICAgIGRlYWRsaW5lUm93LmNyZWF0ZVNwYW4oeyB0ZXh0OiAnRGVhZGxpbmU6JywgY2xzOiAnbWMtZGF0ZS1sYWJlbCcgfSk7XG4gICAgY29uc3QgZGVhZGxpbmVJbnB1dCA9IGRlYWRsaW5lUm93LmNyZWF0ZUVsKCdpbnB1dCcsIHtcbiAgICAgIHR5cGU6ICdkYXRlJyxcbiAgICAgIGNsczogJ21jLWRhdGUtaW5wdXQnLFxuICAgIH0pO1xuICAgIGRlYWRsaW5lUm93LmNyZWF0ZVNwYW4oeyB0ZXh0OiAnUmVtaW5kOicsIGNsczogJ21jLWRhdGUtbGFiZWwnIH0pO1xuICAgIGNvbnN0IHJlbWluZGVyU2VsZWN0ID0gZGVhZGxpbmVSb3cuY3JlYXRlRWwoJ3NlbGVjdCcsIHsgY2xzOiAnbWMtcHJpb3JpdHktc2VsZWN0JyB9KTtcbiAgICByZW1pbmRlclNlbGVjdC5pbm5lckhUTUwgPSBgXG4gICAgICA8b3B0aW9uIHZhbHVlPVwiXCI+Tm8gcmVtaW5kZXI8L29wdGlvbj5cbiAgICAgIDxvcHRpb24gdmFsdWU9XCIxZGF5XCI+MSBkYXkgYmVmb3JlPC9vcHRpb24+XG4gICAgICA8b3B0aW9uIHZhbHVlPVwiM2RheXNcIj4zIGRheXMgYmVmb3JlPC9vcHRpb24+XG4gICAgICA8b3B0aW9uIHZhbHVlPVwiMXdlZWtcIj4xIHdlZWsgYmVmb3JlPC9vcHRpb24+XG4gICAgYDtcblxuICAgIGNvbnN0IGJ0blJvdyA9IGZvcm0uY3JlYXRlRGl2KCdtYy1mb3JtLWJ0bnMnKTtcbiAgICBjb25zdCBzdWJtaXRCdG4gPSBidG5Sb3cuY3JlYXRlRWwoJ2J1dHRvbicsIHsgdGV4dDogJ0FkZCcsIGNsczogJ21jLXN1Ym1pdC1idG4nIH0pO1xuICAgIHN1Ym1pdEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGFzeW5jICgpID0+IHtcbiAgICAgIGlmIChpbnB1dC52YWx1ZS50cmltKCkpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBkZWFkbGluZSA9IGRlYWRsaW5lSW5wdXQudmFsdWUgfHwgdW5kZWZpbmVkO1xuICAgICAgICAgIGNvbnN0IHJlbWluZGVyID0gKHJlbWluZGVyU2VsZWN0LnZhbHVlIHx8IHVuZGVmaW5lZCkgYXMgUmVtaW5kZXJPZmZzZXQgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgYXdhaXQgdGhpcy50YXNrTWFuYWdlci5hZGRUYXNrKFxuICAgICAgICAgICAgZGF0ZSxcbiAgICAgICAgICAgIGlucHV0LnZhbHVlLnRyaW0oKSxcbiAgICAgICAgICAgIHByaW9yaXR5U2VsZWN0LnZhbHVlIGFzIFRhc2tbJ3ByaW9yaXR5J10sXG4gICAgICAgICAgICBkZWFkbGluZSxcbiAgICAgICAgICAgIHJlbWluZGVyIHx8IHVuZGVmaW5lZFxuICAgICAgICAgICk7XG4gICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIG5ldyBOb3RpY2UoYEZhaWxlZCB0byBhZGQgdGFzazogJHtlcnJ9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IGNhbmNlbEJ0biA9IGJ0blJvdy5jcmVhdGVFbCgnYnV0dG9uJywgeyB0ZXh0OiAnQ2FuY2VsJywgY2xzOiAnbWMtY2FuY2VsLWJ0bicgfSk7XG4gICAgY2FuY2VsQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgZm9ybS5yZW1vdmUoKTtcbiAgICB9KTtcblxuICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBhc3luYyAoZSkgPT4ge1xuICAgICAgaWYgKGUua2V5ID09PSAnRW50ZXInICYmIGlucHV0LnZhbHVlLnRyaW0oKSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IGRlYWRsaW5lID0gZGVhZGxpbmVJbnB1dC52YWx1ZSB8fCB1bmRlZmluZWQ7XG4gICAgICAgICAgY29uc3QgcmVtaW5kZXIgPSAocmVtaW5kZXJTZWxlY3QudmFsdWUgfHwgdW5kZWZpbmVkKSBhcyBSZW1pbmRlck9mZnNldCB8IHVuZGVmaW5lZDtcbiAgICAgICAgICBhd2FpdCB0aGlzLnRhc2tNYW5hZ2VyLmFkZFRhc2soXG4gICAgICAgICAgICBkYXRlLFxuICAgICAgICAgICAgaW5wdXQudmFsdWUudHJpbSgpLFxuICAgICAgICAgICAgcHJpb3JpdHlTZWxlY3QudmFsdWUgYXMgVGFza1sncHJpb3JpdHknXSxcbiAgICAgICAgICAgIGRlYWRsaW5lLFxuICAgICAgICAgICAgcmVtaW5kZXIgfHwgdW5kZWZpbmVkXG4gICAgICAgICAgKTtcbiAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgbmV3IE5vdGljZShgRmFpbGVkIHRvIGFkZCB0YXNrOiAke2Vycn1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZW5kZXJSZW1pbmRlckJhbm5lcihjb250YWluZXI6IEhUTUxFbGVtZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMub3ZlcmR1ZVRhc2tzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXG4gICAgY29uc3QgYmFubmVyID0gY29udGFpbmVyLmNyZWF0ZURpdignbWMtcmVtaW5kZXItYmFubmVyJyk7XG4gICAgY29uc3Qgb3ZlcmR1ZSA9IHRoaXMub3ZlcmR1ZVRhc2tzLmZpbHRlcih0ID0+IHQuZGF0ZSA8IHRvZGF5U3RyKCkpO1xuICAgIGNvbnN0IHRvZGF5ID0gdGhpcy5vdmVyZHVlVGFza3MuZmlsdGVyKHQgPT4gdC5kYXRlID09PSB0b2RheVN0cigpKTtcblxuICAgIGlmIChvdmVyZHVlLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IG92ZXJkdWVFbCA9IGJhbm5lci5jcmVhdGVEaXYoJ21jLXJlbWluZGVyLW92ZXJkdWUnKTtcbiAgICAgIG92ZXJkdWVFbC5jcmVhdGVTcGFuKHsgdGV4dDogYFx1MjZBMCBPdmVyZHVlOiAke292ZXJkdWUubGVuZ3RofSB0YXNrKHMpYCB9KTtcblxuICAgICAgZm9yIChjb25zdCBpdGVtIG9mIG92ZXJkdWUuc2xpY2UoMCwgMykpIHtcbiAgICAgICAgb3ZlcmR1ZUVsLmNyZWF0ZURpdignbWMtcmVtaW5kZXItaXRlbScpLnNldFRleHQoXG4gICAgICAgICAgYCR7aXRlbS5kYXRlfTogJHtpdGVtLnRhc2sudGV4dH1gXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRvZGF5Lmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IHRvZGF5RWwgPSBiYW5uZXIuY3JlYXRlRGl2KCdtYy1yZW1pbmRlci10b2RheScpO1xuICAgICAgdG9kYXlFbC5jcmVhdGVTcGFuKHsgdGV4dDogYFxcdXsxRjRDQ30gVG9kYXk6ICR7dG9kYXkubGVuZ3RofSB0YXNrKHMpYCB9KTtcbiAgICB9XG4gIH1cbn1cbiIsICJleHBvcnQgdHlwZSBSZW1pbmRlck9mZnNldCA9ICcxZGF5JyB8ICczZGF5cycgfCAnMXdlZWsnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRhc2sge1xuICBpZDogc3RyaW5nO1xuICB0ZXh0OiBzdHJpbmc7XG4gIGRvbmU6IGJvb2xlYW47XG4gIHByaW9yaXR5OiAnbG93JyB8ICdtZWRpdW0nIHwgJ2hpZ2gnO1xuICB0YWdzOiBzdHJpbmdbXTtcbiAgZGVhZGxpbmU/OiBzdHJpbmc7XG4gIHJlbWluZGVyPzogUmVtaW5kZXJPZmZzZXQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGF5RGF0YSB7XG4gIGRhdGU6IHN0cmluZztcbiAgcGF0aDogc3RyaW5nO1xuICB0YXNrczogVGFza1tdO1xuICBib2R5OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2FsZW5kYXJTdGF0ZSB7XG4gIGN1cnJlbnRZZWFyOiBudW1iZXI7XG4gIGN1cnJlbnRNb250aDogbnVtYmVyO1xuICBzZWxlY3RlZERhdGU6IHN0cmluZyB8IG51bGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvamVjdCB7XG4gIG5hbWU6IHN0cmluZztcbiAgdGFnOiBzdHJpbmc7XG4gIHRhc2tzOiB7IGRhdGU6IHN0cmluZzsgdGFzazogVGFzayB9W107XG4gIHN0YXJ0RGF0ZTogc3RyaW5nO1xuICBlbmREYXRlOiBzdHJpbmc7XG4gIGRvbmVDb3VudDogbnVtYmVyO1xuICB0b3RhbENvdW50OiBudW1iZXI7XG59XG5cbmV4cG9ydCB0eXBlIFZpZXdNb2RlID0gJ2NhbGVuZGFyJyB8ICdwcm9qZWN0cyc7XG5cbmV4cG9ydCBjb25zdCBWSUVXX1RZUEVfQ0FMRU5EQVIgPSAnc3VwZXJtZW1vLXZpZXcnO1xuXG5leHBvcnQgY29uc3QgRElBUllfRk9MREVSID0gJ1x1NjVFNVx1OEJCMCc7XG5cbmV4cG9ydCBjb25zdCBQUklPUklUWV9DT0xPUlM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIGhpZ2g6ICcjZmY2YjZiJyxcbiAgbWVkaXVtOiAnI2ZmZDkzZCcsXG4gIGxvdzogJyM2YmNmN2YnLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlSWQoKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNyeXB0by5yYW5kb21VVUlEKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b2RheVN0cigpOiBzdHJpbmcge1xuICBjb25zdCBkID0gbmV3IERhdGUoKTtcbiAgcmV0dXJuIGAke2QuZ2V0RnVsbFllYXIoKX0tJHtTdHJpbmcoZC5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgJzAnKX0tJHtTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyl9YDtcbn1cbiIsICJpbXBvcnQgeyBWYXVsdCwgVEZpbGUgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBESUFSWV9GT0xERVIgfSBmcm9tICcuL3R5cGVzJztcblxuY29uc3QgRElBUllfUkUgPSAvXlxcZHs0fS1cXGR7Mn0tXFxkezJ9XFwubWQkLztcblxuLyoqXG4gKiBTY2FuIHRoZSB2YXVsdCBmb3IgZGlhcnkgZmlsZXMuIFJldHVybnMgdmF1bHQtcmVsYXRpdmUgcGF0aHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzY2FuRGlhcnlGaWxlcyh2YXVsdDogVmF1bHQpOiBURmlsZVtdIHtcbiAgY29uc3QgZm9sZGVyID0gdmF1bHQuZ2V0Rm9sZGVyQnlQYXRoKERJQVJZX0ZPTERFUik7XG4gIGlmICghZm9sZGVyKSByZXR1cm4gW107XG4gIGNvbnN0IGZpbGVzID0gKGZvbGRlciBhcyBhbnkpLmNoaWxkcmVuPy5maWx0ZXIoXG4gICAgKGY6IGFueSkgPT4gZiBpbnN0YW5jZW9mIFRGaWxlICYmIERJQVJZX1JFLnRlc3QoZi5uYW1lKVxuICApIHx8IFtdO1xuICByZXR1cm4gZmlsZXMgYXMgVEZpbGVbXTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIHZhdWx0LXJlbGF0aXZlIHBhdGggZm9yIGEgZ2l2ZW4gZGF0ZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRpYXJ5UGF0aChkYXRlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7RElBUllfRk9MREVSfS8ke2RhdGV9Lm1kYDtcbn1cblxuLyoqXG4gKiBFbnN1cmUgdGhlIGRpYXJ5IGZvbGRlciBleGlzdHMuIENhbGxlZCBvbiBwbHVnaW4gaW5pdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGVuc3VyZURpYXJ5Rm9sZGVyKHZhdWx0OiBWYXVsdCk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBleGlzdHMgPSB2YXVsdC5nZXRGb2xkZXJCeVBhdGgoRElBUllfRk9MREVSKTtcbiAgaWYgKCFleGlzdHMpIHtcbiAgICBhd2FpdCB2YXVsdC5jcmVhdGVGb2xkZXIoRElBUllfRk9MREVSKTtcbiAgfVxufVxuXG4vKipcbiAqIEdyb3VwIGRpYXJ5IGZpbGVzIGJ5IG1vbnRoOiByZXR1cm5zIE1hcDxcIllZWVktTU1cIiwgVEZpbGVbXT5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdyb3VwQnlNb250aChmaWxlczogVEZpbGVbXSk6IE1hcDxzdHJpbmcsIFRGaWxlW10+IHtcbiAgY29uc3QgbWFwID0gbmV3IE1hcDxzdHJpbmcsIFRGaWxlW10+KCk7XG4gIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgIGNvbnN0IG5hbWUgPSBmaWxlLm5hbWU7IC8vIFlZWVktTU0tREQubWRcbiAgICBjb25zdCBtb250aCA9IG5hbWUuc2xpY2UoMCwgNyk7IC8vIFlZWVktTU1cbiAgICBpZiAoIW1hcC5oYXMobW9udGgpKSBtYXAuc2V0KG1vbnRoLCBbXSk7XG4gICAgbWFwLmdldChtb250aCkhLnB1c2goZmlsZSk7XG4gIH1cbiAgcmV0dXJuIG1hcDtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIHNldCBvZiBkYXRlcyAoZGF5cyBvZiBtb250aCkgdGhhdCBoYXZlIGRpYXJ5IGZpbGVzIGZvciBhIGdpdmVuIG1vbnRoLlxuICogUmV0dXJucyBTZXQgb2YgZGF5IG51bWJlcnMgKDEtMzEpIHRoYXQgZXhpc3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkYXlzV2l0aEVudHJpZXMoZmlsZXM6IFRGaWxlW10sIHllYXI6IG51bWJlciwgbW9udGg6IG51bWJlcik6IFNldDxudW1iZXI+IHtcbiAgY29uc3QgcHJlZml4ID0gYCR7eWVhcn0tJHtTdHJpbmcobW9udGggKyAxKS5wYWRTdGFydCgyLCAnMCcpfWA7XG4gIGNvbnN0IGRheXMgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgaWYgKGZpbGUubmFtZS5zdGFydHNXaXRoKHByZWZpeCkpIHtcbiAgICAgIGNvbnN0IGRheSA9IHBhcnNlSW50KGZpbGUubmFtZS5zbGljZSg4LCAxMCksIDEwKTtcbiAgICAgIGlmICghaXNOYU4oZGF5KSkgZGF5cy5hZGQoZGF5KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRheXM7XG59XG4iLCAiaW1wb3J0IHsgVGFzayB9IGZyb20gJy4vdHlwZXMnO1xuXG5jb25zdCBGUk9OVE1BVFRFUl9SRSA9IC9eLS0tXFxuKFtcXHNcXFNdKj8pXFxuLS0tXFxuPyhbXFxzXFxTXSopJC87XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUZyb250bWF0dGVyKGNvbnRlbnQ6IHN0cmluZyk6IHsgdGFza3M6IFRhc2tbXTsgYm9keTogc3RyaW5nIH0gfCBudWxsIHtcbiAgY29uc3QgbWF0Y2ggPSBjb250ZW50Lm1hdGNoKEZST05UTUFUVEVSX1JFKTtcbiAgaWYgKCFtYXRjaCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgeWFtbEJsb2NrID0gbWF0Y2hbMV07XG4gIGNvbnN0IGJvZHkgPSBtYXRjaFsyXSB8fCAnJztcblxuICBjb25zdCB0YXNrczogVGFza1tdID0gW107XG4gIGNvbnN0IGxpbmVzID0geWFtbEJsb2NrLnNwbGl0KCdcXG4nKTtcblxuICBsZXQgaW5UYXNrcyA9IGZhbHNlO1xuICBsZXQgY3VycmVudFRhc2s6IFBhcnRpYWw8VGFzaz4gfCBudWxsID0gbnVsbDtcblxuICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICBjb25zdCB0cmltbWVkID0gbGluZS50cmltKCk7XG5cbiAgICBpZiAodHJpbW1lZCA9PT0gJ3Rhc2tzOicpIHtcbiAgICAgIGluVGFza3MgPSB0cnVlO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGluVGFza3MgJiYgdHJpbW1lZC5zdGFydHNXaXRoKCctJykpIHtcbiAgICAgIGlmIChjdXJyZW50VGFzayAmJiBjdXJyZW50VGFzay5pZCAmJiBjdXJyZW50VGFzay50ZXh0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGFza3MucHVzaCh7XG4gICAgICAgICAgaWQ6IGN1cnJlbnRUYXNrLmlkLFxuICAgICAgICAgIHRleHQ6IGN1cnJlbnRUYXNrLnRleHQsXG4gICAgICAgICAgZG9uZTogY3VycmVudFRhc2suZG9uZSA/PyBmYWxzZSxcbiAgICAgICAgICBwcmlvcml0eTogY3VycmVudFRhc2sucHJpb3JpdHkgPz8gJ21lZGl1bScsXG4gICAgICAgICAgdGFnczogY3VycmVudFRhc2sudGFncyA/PyBbXSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjdXJyZW50VGFzayA9IHt9O1xuICAgICAgY29uc3QgaW5saW5lID0gdHJpbW1lZC5yZXBsYWNlKC9eLVxccyovLCAnJyk7XG4gICAgICBwYXJzZVRhc2tJbmxpbmUoaW5saW5lLCBjdXJyZW50VGFzayk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoaW5UYXNrcyAmJiBjdXJyZW50VGFzayAmJiB0cmltbWVkICE9PSAnJykge1xuICAgICAgcGFyc2VUYXNrUHJvcGVydHkodHJpbW1lZCwgY3VycmVudFRhc2spO1xuICAgIH1cblxuICAgIGlmIChpblRhc2tzICYmIHRyaW1tZWQgPT09ICcnICYmIGN1cnJlbnRUYXNrKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoaW5UYXNrcyAmJiAhdHJpbW1lZC5zdGFydHNXaXRoKCctJykgJiYgIXRyaW1tZWQuc3RhcnRzV2l0aCgnICAnKSAmJiAhdHJpbW1lZC5zdGFydHNXaXRoKCdcXHQnKSkge1xuICAgICAgaWYgKGN1cnJlbnRUYXNrICYmIGN1cnJlbnRUYXNrLmlkICYmIGN1cnJlbnRUYXNrLnRleHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0YXNrcy5wdXNoKHtcbiAgICAgICAgICBpZDogY3VycmVudFRhc2suaWQsXG4gICAgICAgICAgdGV4dDogY3VycmVudFRhc2sudGV4dCxcbiAgICAgICAgICBkb25lOiBjdXJyZW50VGFzay5kb25lID8/IGZhbHNlLFxuICAgICAgICAgIHByaW9yaXR5OiBjdXJyZW50VGFzay5wcmlvcml0eSA/PyAnbWVkaXVtJyxcbiAgICAgICAgICB0YWdzOiBjdXJyZW50VGFzay50YWdzID8/IFtdLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGN1cnJlbnRUYXNrID0gbnVsbDtcbiAgICAgIGluVGFza3MgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBpZiAoY3VycmVudFRhc2sgJiYgY3VycmVudFRhc2suaWQgJiYgY3VycmVudFRhc2sudGV4dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdGFza3MucHVzaCh7XG4gICAgICBpZDogY3VycmVudFRhc2suaWQsXG4gICAgICB0ZXh0OiBjdXJyZW50VGFzay50ZXh0LFxuICAgICAgZG9uZTogY3VycmVudFRhc2suZG9uZSA/PyBmYWxzZSxcbiAgICAgIHByaW9yaXR5OiBjdXJyZW50VGFzay5wcmlvcml0eSA/PyAnbWVkaXVtJyxcbiAgICAgIHRhZ3M6IGN1cnJlbnRUYXNrLnRhZ3MgPz8gW10sXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4geyB0YXNrcywgYm9keSB9O1xufVxuXG5mdW5jdGlvbiBwYXJzZVRhc2tJbmxpbmUobGluZTogc3RyaW5nLCB0YXNrOiBQYXJ0aWFsPFRhc2s+KTogdm9pZCB7XG4gIGNvbnN0IHBhcnRzID0gc3BsaXRCeUNvbW1hKGxpbmUpO1xuICBmb3IgKGNvbnN0IHBhcnQgb2YgcGFydHMpIHtcbiAgICBwYXJzZVRhc2tQcm9wZXJ0eShwYXJ0LnRyaW0oKSwgdGFzayk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3BsaXRCeUNvbW1hKHN0cjogc3RyaW5nKTogc3RyaW5nW10ge1xuICBjb25zdCByZXN1bHQ6IHN0cmluZ1tdID0gW107XG4gIGxldCBjdXJyZW50ID0gJyc7XG4gIGxldCBpblF1b3RlcyA9IGZhbHNlO1xuICBsZXQgaW5CcmFja2V0cyA9IDA7XG5cbiAgZm9yIChjb25zdCBjaCBvZiBzdHIpIHtcbiAgICBpZiAoY2ggPT09ICdcIicpIGluUXVvdGVzID0gIWluUXVvdGVzO1xuICAgIGlmIChjaCA9PT0gJ1snICYmICFpblF1b3RlcykgaW5CcmFja2V0cysrO1xuICAgIGlmIChjaCA9PT0gJ10nICYmICFpblF1b3RlcykgaW5CcmFja2V0cy0tO1xuICAgIGlmIChjaCA9PT0gJywnICYmICFpblF1b3RlcyAmJiBpbkJyYWNrZXRzID09PSAwKSB7XG4gICAgICByZXN1bHQucHVzaChjdXJyZW50KTtcbiAgICAgIGN1cnJlbnQgPSAnJztcbiAgICB9IGVsc2Uge1xuICAgICAgY3VycmVudCArPSBjaDtcbiAgICB9XG4gIH1cbiAgaWYgKGN1cnJlbnQudHJpbSgpKSByZXN1bHQucHVzaChjdXJyZW50KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gcGFyc2VUYXNrUHJvcGVydHkodHJpbW1lZDogc3RyaW5nLCB0YXNrOiBQYXJ0aWFsPFRhc2s+KTogdm9pZCB7XG4gIGNvbnN0IGNvbG9uSWR4ID0gdHJpbW1lZC5pbmRleE9mKCc6Jyk7XG4gIGlmIChjb2xvbklkeCA9PT0gLTEpIHJldHVybjtcblxuICBjb25zdCBrZXkgPSB0cmltbWVkLnNsaWNlKDAsIGNvbG9uSWR4KS50cmltKCk7XG4gIGxldCB2YWx1ZSA9IHRyaW1tZWQuc2xpY2UoY29sb25JZHggKyAxKS50cmltKCk7XG5cbiAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9eXCIoLiopXCIkLywgJyQxJyk7XG4gIHZhbHVlID0gdmFsdWUucmVwbGFjZSgvXFxcXFwiL2csICdcIicpO1xuXG4gIHN3aXRjaCAoa2V5KSB7XG4gICAgY2FzZSAnaWQnOlxuICAgICAgdGFzay5pZCA9IHZhbHVlO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAndGV4dCc6XG4gICAgICB0YXNrLnRleHQgPSB2YWx1ZTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2RvbmUnOlxuICAgICAgdGFzay5kb25lID0gdmFsdWUgPT09ICd0cnVlJztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3ByaW9yaXR5JzpcbiAgICAgIHRhc2sucHJpb3JpdHkgPSAodmFsdWUgPT09ICdoaWdoJyB8fCB2YWx1ZSA9PT0gJ2xvdycpID8gdmFsdWUgOiAnbWVkaXVtJztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2RlYWRsaW5lJzpcbiAgICAgIHRhc2suZGVhZGxpbmUgPSB2YWx1ZTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3JlbWluZGVyJzpcbiAgICAgIGlmICh2YWx1ZSA9PT0gJzFkYXknIHx8IHZhbHVlID09PSAnM2RheXMnIHx8IHZhbHVlID09PSAnMXdlZWsnKSB7XG4gICAgICAgIHRhc2sucmVtaW5kZXIgPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3RhZ3MnOlxuICAgICAgY29uc3QgYXJyTWF0Y2ggPSB2YWx1ZS5tYXRjaCgvXlxcWyguKilcXF0kLyk7XG4gICAgICBpZiAoYXJyTWF0Y2gpIHtcbiAgICAgICAgdGFzay50YWdzID0gYXJyTWF0Y2hbMV0uc3BsaXQoJywnKS5tYXAodCA9PiB0LnRyaW0oKS5yZXBsYWNlKC9eXCIoLiopXCIkLywgJyQxJykucmVwbGFjZSgvXFxcXFwiL2csICdcIicpKS5maWx0ZXIoQm9vbGVhbik7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplRnJvbnRtYXR0ZXIodGFza3M6IFRhc2tbXSwgYm9keTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgeWFtbFRhc2tzID0gdGFza3MubWFwKHQgPT4ge1xuICAgIGNvbnN0IHRhZ3MgPSBgWyR7dC50YWdzLm1hcCh4ID0+IGBcIiR7eC5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJyl9XCJgKS5qb2luKCcsICcpfV1gO1xuICAgIGNvbnN0IGRlYWRsaW5lTGluZSA9IHQuZGVhZGxpbmUgPyBgXFxuICAgIGRlYWRsaW5lOiBcIiR7dC5kZWFkbGluZX1cImAgOiAnJztcbiAgICBjb25zdCByZW1pbmRlckxpbmUgPSB0LnJlbWluZGVyID8gYFxcbiAgICByZW1pbmRlcjogJHt0LnJlbWluZGVyfWAgOiAnJztcbiAgICByZXR1cm4gYCAgLSBpZDogXCIke3QuaWR9XCJcXG4gICAgdGV4dDogXCIke3QudGV4dC5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJyl9XCJcXG4gICAgZG9uZTogJHt0LmRvbmV9XFxuICAgIHByaW9yaXR5OiAke3QucHJpb3JpdHl9XFxuICAgIHRhZ3M6ICR7dGFnc30ke2RlYWRsaW5lTGluZX0ke3JlbWluZGVyTGluZX1gO1xuICB9KS5qb2luKCdcXG4nKTtcblxuICBjb25zdCB5YW1sQmxvY2sgPSB0YXNrcy5sZW5ndGggPiAwXG4gICAgPyBgdGFza3M6XFxuJHt5YW1sVGFza3N9YFxuICAgIDogJyc7XG5cbiAgcmV0dXJuIHlhbWxCbG9ja1xuICAgID8gYC0tLVxcbiR7eWFtbEJsb2NrfVxcbi0tLVxcbiR7Ym9keX1gXG4gICAgOiBgLS0tXFxuLS0tXFxuJHtib2R5fWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVGcm9udG1hdHRlcihjb250ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoRlJPTlRNQVRURVJfUkUudGVzdChjb250ZW50KSkgcmV0dXJuIGNvbnRlbnQ7XG4gIHJldHVybiBgLS0tXFxuLS0tXFxuJHtjb250ZW50fWA7XG59XG4iLCAiaW1wb3J0IHsgVmF1bHQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBUYXNrLCBEYXlEYXRhLCBnZW5lcmF0ZUlkIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBkaWFyeVBhdGggfSBmcm9tICcuL3NjYW5uZXInO1xuaW1wb3J0IHsgcGFyc2VGcm9udG1hdHRlciwgc2VyaWFsaXplRnJvbnRtYXR0ZXIsIGVuc3VyZUZyb250bWF0dGVyIH0gZnJvbSAnLi9wYXJzZXInO1xuXG5leHBvcnQgY2xhc3MgVGFza01hbmFnZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHZhdWx0OiBWYXVsdCkge31cblxuICBhc3luYyBnZXREYXkoZGF0ZTogc3RyaW5nKTogUHJvbWlzZTxEYXlEYXRhPiB7XG4gICAgY29uc3QgcGF0aCA9IGRpYXJ5UGF0aChkYXRlKTtcbiAgICBjb25zdCBmaWxlID0gdGhpcy52YXVsdC5nZXRGaWxlQnlQYXRoKHBhdGgpO1xuXG4gICAgaWYgKCFmaWxlKSB7XG4gICAgICByZXR1cm4geyBkYXRlLCBwYXRoLCB0YXNrczogW10sIGJvZHk6ICcnIH07XG4gICAgfVxuXG4gICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMudmF1bHQuY2FjaGVkUmVhZChmaWxlKTtcbiAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUZyb250bWF0dGVyKGNvbnRlbnQpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGRhdGUsXG4gICAgICBwYXRoLFxuICAgICAgdGFza3M6IHBhcnNlZD8udGFza3MgPz8gW10sXG4gICAgICBib2R5OiBwYXJzZWQ/LmJvZHkgPz8gY29udGVudCxcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgYWRkVGFzayhkYXRlOiBzdHJpbmcsIHRleHQ6IHN0cmluZywgcHJpb3JpdHk6IFRhc2tbJ3ByaW9yaXR5J10gPSAnbWVkaXVtJywgZGVhZGxpbmU/OiBzdHJpbmcsIHJlbWluZGVyPzogVGFza1sncmVtaW5kZXInXSk6IFByb21pc2U8VGFzaz4ge1xuICAgIGNvbnN0IHRhc2s6IFRhc2sgPSB7XG4gICAgICBpZDogZ2VuZXJhdGVJZCgpLFxuICAgICAgdGV4dCxcbiAgICAgIGRvbmU6IGZhbHNlLFxuICAgICAgcHJpb3JpdHksXG4gICAgICB0YWdzOiBbXSxcbiAgICB9O1xuICAgIGlmIChkZWFkbGluZSkgdGFzay5kZWFkbGluZSA9IGRlYWRsaW5lO1xuICAgIGlmIChyZW1pbmRlcikgdGFzay5yZW1pbmRlciA9IHJlbWluZGVyO1xuXG4gICAgY29uc3QgcGF0aCA9IGRpYXJ5UGF0aChkYXRlKTtcbiAgICBjb25zdCBmaWxlID0gdGhpcy52YXVsdC5nZXRGaWxlQnlQYXRoKHBhdGgpO1xuXG4gICAgaWYgKCFmaWxlKSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gc2VyaWFsaXplRnJvbnRtYXR0ZXIoW3Rhc2tdLCAnJyk7XG4gICAgICBhd2FpdCB0aGlzLnZhdWx0LmNyZWF0ZShwYXRoLCBjb250ZW50KTtcbiAgICAgIHJldHVybiB0YXNrO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMudmF1bHQucHJvY2VzcyhmaWxlLCAoY29udGVudCkgPT4ge1xuICAgICAgY29uc3Qgd2l0aEZtID0gZW5zdXJlRnJvbnRtYXR0ZXIoY29udGVudCk7XG4gICAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUZyb250bWF0dGVyKHdpdGhGbSk7XG4gICAgICBjb25zdCB0YXNrcyA9IHBhcnNlZD8udGFza3MgPz8gW107XG4gICAgICB0YXNrcy5wdXNoKHRhc2spO1xuICAgICAgcmV0dXJuIHNlcmlhbGl6ZUZyb250bWF0dGVyKHRhc2tzLCBwYXJzZWQ/LmJvZHkgPz8gJycpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRhc2s7XG4gIH1cblxuICBhc3luYyB1cGRhdGVUYXNrKGRhdGU6IHN0cmluZywgdGFza0lkOiBzdHJpbmcsIHVwZGF0ZXM6IFBhcnRpYWw8VGFzaz4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBwYXRoID0gZGlhcnlQYXRoKGRhdGUpO1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLnZhdWx0LmdldEZpbGVCeVBhdGgocGF0aCk7XG4gICAgaWYgKCFmaWxlKSByZXR1cm47XG5cbiAgICBhd2FpdCB0aGlzLnZhdWx0LnByb2Nlc3MoZmlsZSwgKGNvbnRlbnQpID0+IHtcbiAgICAgIGNvbnN0IHdpdGhGbSA9IGVuc3VyZUZyb250bWF0dGVyKGNvbnRlbnQpO1xuICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VGcm9udG1hdHRlcih3aXRoRm0pO1xuICAgICAgaWYgKCFwYXJzZWQpIHJldHVybiBjb250ZW50O1xuXG4gICAgICBjb25zdCB0YXNrcyA9IHBhcnNlZC50YXNrcy5tYXAodCA9PlxuICAgICAgICB0LmlkID09PSB0YXNrSWQgPyB7IC4uLnQsIC4uLnVwZGF0ZXMgfSA6IHRcbiAgICAgICk7XG4gICAgICByZXR1cm4gc2VyaWFsaXplRnJvbnRtYXR0ZXIodGFza3MsIHBhcnNlZC5ib2R5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZVRhc2soZGF0ZTogc3RyaW5nLCB0YXNrSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHBhdGggPSBkaWFyeVBhdGgoZGF0ZSk7XG4gICAgY29uc3QgZmlsZSA9IHRoaXMudmF1bHQuZ2V0RmlsZUJ5UGF0aChwYXRoKTtcbiAgICBpZiAoIWZpbGUpIHJldHVybjtcblxuICAgIGF3YWl0IHRoaXMudmF1bHQucHJvY2VzcyhmaWxlLCAoY29udGVudCkgPT4ge1xuICAgICAgY29uc3Qgd2l0aEZtID0gZW5zdXJlRnJvbnRtYXR0ZXIoY29udGVudCk7XG4gICAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUZyb250bWF0dGVyKHdpdGhGbSk7XG4gICAgICBpZiAoIXBhcnNlZCkgcmV0dXJuIGNvbnRlbnQ7XG5cbiAgICAgIGNvbnN0IHRhc2tzID0gcGFyc2VkLnRhc2tzLmZpbHRlcih0ID0+IHQuaWQgIT09IHRhc2tJZCk7XG4gICAgICByZXR1cm4gc2VyaWFsaXplRnJvbnRtYXR0ZXIodGFza3MsIHBhcnNlZC5ib2R5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGFwcGVuZEJvZHkoZGF0ZTogc3RyaW5nLCB0ZXh0OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBwYXRoID0gZGlhcnlQYXRoKGRhdGUpO1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLnZhdWx0LmdldEZpbGVCeVBhdGgocGF0aCk7XG5cbiAgICBpZiAoIWZpbGUpIHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBgLS0tXFxuLS0tXFxuJHt0ZXh0fVxcbmA7XG4gICAgICBhd2FpdCB0aGlzLnZhdWx0LmNyZWF0ZShwYXRoLCBjb250ZW50KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnZhdWx0LnByb2Nlc3MoZmlsZSwgKGNvbnRlbnQpID0+IHtcbiAgICAgIGNvbnN0IHdpdGhGbSA9IGVuc3VyZUZyb250bWF0dGVyKGNvbnRlbnQpO1xuICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VGcm9udG1hdHRlcih3aXRoRm0pO1xuICAgICAgaWYgKCFwYXJzZWQpIHJldHVybiBjb250ZW50O1xuICAgICAgY29uc3QgbmV3Qm9keSA9IHBhcnNlZC5ib2R5ICsgJ1xcbicgKyB0ZXh0O1xuICAgICAgcmV0dXJuIHNlcmlhbGl6ZUZyb250bWF0dGVyKHBhcnNlZC50YXNrcywgbmV3Qm9keSk7XG4gICAgfSk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBWYXVsdCwgVEZpbGUgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBUYXNrLCB0b2RheVN0ciwgUmVtaW5kZXJPZmZzZXQgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IHNjYW5EaWFyeUZpbGVzIH0gZnJvbSAnLi9zY2FubmVyJztcbmltcG9ydCB7IHBhcnNlRnJvbnRtYXR0ZXIgfSBmcm9tICcuL3BhcnNlcic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgT3ZlcmR1ZVRhc2sge1xuICBkYXRlOiBzdHJpbmc7XG4gIHRhc2s6IFRhc2s7XG4gIHBhdGg6IHN0cmluZztcbn1cblxuLyoqIE1hcCByZW1pbmRlciBvZmZzZXQgdG8gZGF5cyAqL1xuY29uc3QgUkVNSU5ERVJfREFZUzogUmVjb3JkPFJlbWluZGVyT2Zmc2V0LCBudW1iZXI+ID0ge1xuICAnMWRheSc6IDEsXG4gICczZGF5cyc6IDMsXG4gICcxd2Vlayc6IDcsXG59O1xuXG4vKipcbiAqIFNjYW4gYWxsIGRpYXJ5IGZpbGVzLCBjb2xsZWN0IGluY29tcGxldGUgdGFza3MgZnJvbSBkYXRlcyA8PSB0b2RheS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldE92ZXJkdWVUYXNrcyh2YXVsdDogVmF1bHQpOiBQcm9taXNlPE92ZXJkdWVUYXNrW10+IHtcbiAgY29uc3QgZmlsZXMgPSBzY2FuRGlhcnlGaWxlcyh2YXVsdCk7XG4gIGNvbnN0IHRvZGF5ID0gdG9kYXlTdHIoKTtcbiAgY29uc3QgcmVzdWx0OiBPdmVyZHVlVGFza1tdID0gW107XG5cbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgY29uc3QgZGF0ZSA9IGZpbGUubmFtZS5yZXBsYWNlKC9cXC5tZCQvLCAnJyk7XG4gICAgaWYgKGRhdGUgPiB0b2RheSkgY29udGludWU7XG5cbiAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdmF1bHQuY2FjaGVkUmVhZChmaWxlKTtcbiAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUZyb250bWF0dGVyKGNvbnRlbnQpO1xuICAgIGlmICghcGFyc2VkKSBjb250aW51ZTtcblxuICAgIGZvciAoY29uc3QgdGFzayBvZiBwYXJzZWQudGFza3MpIHtcbiAgICAgIGlmICghdGFzay5kb25lKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKHsgZGF0ZSwgdGFzaywgcGF0aDogZmlsZS5wYXRoIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogR2V0IHRhc2sgY291bnRzIHBlciBkYXkgZm9yIGNhbGVuZGFyIGRvdCBpbmRpY2F0b3JzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGFpbHlUYXNrQ291bnRzKFxuICB2YXVsdDogVmF1bHQsXG4gIHllYXI6IG51bWJlcixcbiAgbW9udGg6IG51bWJlclxuKTogUHJvbWlzZTxNYXA8bnVtYmVyLCBudW1iZXI+PiB7XG4gIGNvbnN0IHByZWZpeCA9IGAke3llYXJ9LSR7U3RyaW5nKG1vbnRoICsgMSkucGFkU3RhcnQoMiwgJzAnKX1gO1xuICBjb25zdCBmaWxlcyA9IHNjYW5EaWFyeUZpbGVzKHZhdWx0KS5maWx0ZXIoZiA9PiBmLm5hbWUuc3RhcnRzV2l0aChwcmVmaXgpKTtcbiAgY29uc3QgbWFwID0gbmV3IE1hcDxudW1iZXIsIG51bWJlcj4oKTtcblxuICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICBjb25zdCBkYXkgPSBwYXJzZUludChmaWxlLm5hbWUuc2xpY2UoOCwgMTApLCAxMCk7XG4gICAgaWYgKGlzTmFOKGRheSkpIGNvbnRpbnVlO1xuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB2YXVsdC5jYWNoZWRSZWFkKGZpbGUpO1xuICAgIGNvbnN0IHRhc2tDb3VudCA9IChjb250ZW50Lm1hdGNoKC9cXG5cXHMrLVxccytpZDovZykgfHwgW10pLmxlbmd0aDtcbiAgICBpZiAodGFza0NvdW50ID4gMCkge1xuICAgICAgbWFwLnNldChkYXksIChtYXAuZ2V0KGRheSkgfHwgMCkgKyB0YXNrQ291bnQpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtYXA7XG59XG5cbi8qKiBEYXRhIGZvciBhIHJlbWluZGVyIHRoYXQgc2hvdWxkIGZpcmUgKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVtaW5kZXJBbGVydCB7XG4gIHRhc2s6IFRhc2s7XG4gIGRhdGU6IHN0cmluZztcbiAgcGF0aDogc3RyaW5nO1xuICBvZmZzZXQ6IFJlbWluZGVyT2Zmc2V0O1xuICBkYXlzVW50aWw6IG51bWJlcjtcbn1cblxuLyoqIFNldCBvZiBhbHJlYWR5LWZpcmVkIHJlbWluZGVyIGtleXM6IFwidGFza0lkOnJlbWluZGVyT2Zmc2V0XCIgKi9cbmNvbnN0IGZpcmVkUmVtaW5kZXJzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbi8qKlxuICogQ2hlY2sgYWxsIHRhc2tzIGZvciBkdWUgcmVtaW5kZXJzLiBSZXR1cm5zIHRhc2tzIHdob3NlIHJlbWluZGVyIHRocmVzaG9sZFxuICogaGFzIGJlZW4gcmVhY2hlZC4gRWFjaCByZW1pbmRlciBmaXJlcyBvbmx5IG9uY2UgcGVyIHBsdWdpbiBzZXNzaW9uLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tSZW1pbmRlcnModmF1bHQ6IFZhdWx0KTogUHJvbWlzZTxSZW1pbmRlckFsZXJ0W10+IHtcbiAgY29uc3QgZmlsZXMgPSBzY2FuRGlhcnlGaWxlcyh2YXVsdCk7XG4gIGNvbnN0IHRvZGF5ID0gdG9kYXlTdHIoKTtcbiAgY29uc3QgdG9kYXlEYXRlID0gbmV3IERhdGUodG9kYXkpO1xuICBjb25zdCBhbGVydHM6IFJlbWluZGVyQWxlcnRbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB2YXVsdC5jYWNoZWRSZWFkKGZpbGUpO1xuICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlRnJvbnRtYXR0ZXIoY29udGVudCk7XG4gICAgaWYgKCFwYXJzZWQpIGNvbnRpbnVlO1xuXG4gICAgZm9yIChjb25zdCB0YXNrIG9mIHBhcnNlZC50YXNrcykge1xuICAgICAgaWYgKHRhc2suZG9uZSkgY29udGludWU7XG4gICAgICBpZiAoIXRhc2suZGVhZGxpbmUgfHwgIXRhc2sucmVtaW5kZXIpIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCByZW1pbmRlcktleSA9IGAke3Rhc2suaWR9OiR7dGFzay5yZW1pbmRlcn1gO1xuICAgICAgaWYgKGZpcmVkUmVtaW5kZXJzLmhhcyhyZW1pbmRlcktleSkpIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCBkZWFkbGluZURhdGUgPSBuZXcgRGF0ZSh0YXNrLmRlYWRsaW5lKTtcbiAgICAgIGNvbnN0IGRheXNVbnRpbCA9IE1hdGguZmxvb3IoXG4gICAgICAgIChkZWFkbGluZURhdGUuZ2V0VGltZSgpIC0gdG9kYXlEYXRlLmdldFRpbWUoKSkgLyAoMTAwMCAqIDYwICogNjAgKiAyNClcbiAgICAgICk7XG5cbiAgICAgIGNvbnN0IHRocmVzaG9sZCA9IFJFTUlOREVSX0RBWVNbdGFzay5yZW1pbmRlcl07XG4gICAgICBpZiAoZGF5c1VudGlsIDw9IHRocmVzaG9sZCAmJiBkYXlzVW50aWwgPj0gMCkge1xuICAgICAgICBhbGVydHMucHVzaCh7XG4gICAgICAgICAgdGFzayxcbiAgICAgICAgICBkYXRlOiBmaWxlLm5hbWUucmVwbGFjZSgvXFwubWQkLywgJycpLFxuICAgICAgICAgIHBhdGg6IGZpbGUucGF0aCxcbiAgICAgICAgICBvZmZzZXQ6IHRhc2sucmVtaW5kZXIsXG4gICAgICAgICAgZGF5c1VudGlsLFxuICAgICAgICB9KTtcbiAgICAgICAgZmlyZWRSZW1pbmRlcnMuYWRkKHJlbWluZGVyS2V5KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gYWxlcnRzO1xufVxuXG4vKipcbiAqIEZpcmUgYSBzeXN0ZW0gbm90aWZpY2F0aW9uIGZvciBhIHJlbWluZGVyLlxuICogVXNlcyB0aGUgRWxlY3Ryb24gTm90aWZpY2F0aW9uIEFQSSBhdmFpbGFibGUgaW4gT2JzaWRpYW4gZGVza3RvcC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpcmVSZW1pbmRlck5vdGlmaWNhdGlvbihhbGVydDogUmVtaW5kZXJBbGVydCk6IHZvaWQge1xuICB0cnkge1xuICAgIGNvbnN0IHdoZW4gPSBhbGVydC5kYXlzVW50aWwgPT09IDBcbiAgICAgID8gJ3RvZGF5J1xuICAgICAgOiBhbGVydC5kYXlzVW50aWwgPT09IDFcbiAgICAgICAgPyAndG9tb3Jyb3cnXG4gICAgICAgIDogYGluICR7YWxlcnQuZGF5c1VudGlsfSBkYXlzYDtcblxuICAgIGNvbnN0IHRpdGxlID0gYFx1MjNGMCBUYXNrIFJlbWluZGVyYDtcbiAgICBjb25zdCBib2R5ID0gYFwiJHthbGVydC50YXNrLnRleHR9XCIgaXMgZHVlICR7d2hlbn0gKCR7YWxlcnQudGFzay5kZWFkbGluZX0pYDtcblxuICAgIGNvbnN0IG4gPSBuZXcgTm90aWZpY2F0aW9uKHRpdGxlLCB7XG4gICAgICBib2R5LFxuICAgICAgc2lsZW50OiBmYWxzZSxcbiAgICB9KTtcblxuICAgIG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICAvLyBPcGVuaW5nIHRoZSBmaWxlIHdvdWxkIHJlcXVpcmUgYXBwIHJlZmVyZW5jZSBcdTIwMTQgc2tpcCBmb3Igbm93XG4gICAgICBuLmNsb3NlKCk7XG4gICAgfSk7XG4gIH0gY2F0Y2ggKF9lKSB7XG4gICAgLy8gTm90aWZpY2F0aW9uIEFQSSBub3QgYXZhaWxhYmxlIFx1MjAxNCBzaWxlbnRseSBpZ25vcmVcbiAgfVxufVxuXG4vKipcbiAqIFJlcXVlc3Qgbm90aWZpY2F0aW9uIHBlcm1pc3Npb24gaWYgbm90IGdyYW50ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXF1ZXN0Tm90aWZpY2F0aW9uUGVybWlzc2lvbigpOiB2b2lkIHtcbiAgaWYgKHR5cGVvZiBOb3RpZmljYXRpb24gPT09ICd1bmRlZmluZWQnKSByZXR1cm47XG4gIGlmIChOb3RpZmljYXRpb24ucGVybWlzc2lvbiA9PT0gJ2RlZmF1bHQnKSB7XG4gICAgTm90aWZpY2F0aW9uLnJlcXVlc3RQZXJtaXNzaW9uKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXNldCBmaXJlZCByZW1pbmRlcnMgKGUuZy4sIHdoZW4gcGx1Z2luIHJlbG9hZHMpLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzZXRSZW1pbmRlcnMoKTogdm9pZCB7XG4gIGZpcmVkUmVtaW5kZXJzLmNsZWFyKCk7XG59XG4iLCAiaW1wb3J0IHsgVmF1bHQsIFRGaWxlIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgVGFzaywgUHJvamVjdCwgdG9kYXlTdHIgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IHNjYW5EaWFyeUZpbGVzIH0gZnJvbSAnLi9zY2FubmVyJztcbmltcG9ydCB7IHBhcnNlRnJvbnRtYXR0ZXIsIHNlcmlhbGl6ZUZyb250bWF0dGVyLCBlbnN1cmVGcm9udG1hdHRlciB9IGZyb20gJy4vcGFyc2VyJztcblxuLyoqXG4gKiBFeHRyYWN0IG5vdGUtbGV2ZWwgdGFncyBmcm9tIFlBTUwgZnJvbnRtYXR0ZXIuXG4gKiBIYW5kbGVzOiBgdGFnczogZm9vYCwgYHRhZ3M6IFthLCBiXWAsIGB0YWdzOlxcbiAgLSBhXFxuICAtIGJgLCBgdGFnOiBmb29gXG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3ROb3RlVGFncyh5YW1sQmxvY2s6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgdGFnczogc3RyaW5nW10gPSBbXTtcblxuICAvLyBUcnkgaW5saW5lIGFycmF5OiB0YWdzOiBbYSwgYiwgY11cbiAgY29uc3QgaW5saW5lQXJyYXkgPSB5YW1sQmxvY2subWF0Y2goL150YWdzOlxccypcXFsoW15cXF1dKylcXF0vbSk7XG4gIGlmIChpbmxpbmVBcnJheSkge1xuICAgIGZvciAoY29uc3QgcGFydCBvZiBpbmxpbmVBcnJheVsxXS5zcGxpdCgnLCcpKSB7XG4gICAgICBjb25zdCBjbGVhbmVkID0gcGFydC50cmltKCkucmVwbGFjZSgvXlwiKC4qKVwiJC8sICckMScpLnJlcGxhY2UoL14nKC4qKSckLywgJyQxJyk7XG4gICAgICBpZiAoY2xlYW5lZCkgdGFncy5wdXNoKGNsZWFuZWQpO1xuICAgIH1cbiAgICByZXR1cm4gdGFncztcbiAgfVxuXG4gIC8vIFRyeSBzaW5nbGUgbGluZTogdGFnczogZm9vXG4gIGNvbnN0IHNpbmdsZUxpbmUgPSB5YW1sQmxvY2subWF0Y2goL150YWdzOlxccypcIj8oW15cIlxcblxcW1xcXV0rKVwiP1xccyokL20pO1xuICBpZiAoc2luZ2xlTGluZSkge1xuICAgIGNvbnN0IHZhbCA9IHNpbmdsZUxpbmVbMV0udHJpbSgpO1xuICAgIGlmICh2YWwgJiYgIXZhbC5zdGFydHNXaXRoKCctJykpIHtcbiAgICAgIHRhZ3MucHVzaCh2YWwpO1xuICAgICAgcmV0dXJuIHRhZ3M7XG4gICAgfVxuICB9XG5cbiAgLy8gVHJ5IG11bHRpLWxpbmUgbGlzdDogdGFnczpcXG4gIC0gYVxcbiAgLSBiXG4gIGNvbnN0IHRhZ3NTZWN0aW9uID0geWFtbEJsb2NrLm1hdGNoKC9edGFnczpcXHMqXFxuKFtcXHNcXFNdKj8pKD89XFxuXFxTfCQpL20pO1xuICBpZiAodGFnc1NlY3Rpb24pIHtcbiAgICBjb25zdCB0YWdMaW5lcyA9IHRhZ3NTZWN0aW9uWzFdLm1hdGNoQWxsKC9eXFxzKi1cXHMqXCI/KFteXCJcXG5dKylcIj9cXHMqJC9nbSk7XG4gICAgZm9yIChjb25zdCBtIG9mIHRhZ0xpbmVzKSB7XG4gICAgICB0YWdzLnB1c2gobVsxXS50cmltKCkpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEFsc28gY2hlY2sgYHRhZzogeHh4YCAoc2luZ3VsYXIpXG4gIGNvbnN0IHRhZ01hdGNoID0geWFtbEJsb2NrLm1hdGNoKC9edGFnOlxccypcIj8oW15cIlxcbl0rKVwiP1xccyokL20pO1xuICBpZiAodGFnTWF0Y2gpIHtcbiAgICB0YWdzLnB1c2godGFnTWF0Y2hbMV0udHJpbSgpKTtcbiAgfVxuXG4gIHJldHVybiB0YWdzO1xufVxuXG4vKipcbiAqIEV4dHJhY3QgaW5saW5lIHRhZ3MgZnJvbSBub3RlIGJvZHkuXG4gKiBNYXRjaGVzICNwcm9qZWN0LCAjcHJvamVjdC9mb28sICN0YWcvc3VidGFnIGV0Yy5cbiAqL1xuZnVuY3Rpb24gZXh0cmFjdEJvZHlUYWdzKGJvZHk6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgdGFnczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgcmUgPSAvIyhbXFx3LV0rKD86XFwvW1xcdy1dKykqKS9nO1xuICBsZXQgbWF0Y2g7XG4gIHdoaWxlICgobWF0Y2ggPSByZS5leGVjKGJvZHkpKSAhPT0gbnVsbCkge1xuICAgIHRhZ3MucHVzaChtYXRjaFsxXSk7XG4gIH1cbiAgcmV0dXJuIHRhZ3M7XG59XG5cbmZ1bmN0aW9uIGlzUHJvamVjdFRhZyh0YWc6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gdGFnID09PSAncHJvamVjdCcgfHwgdGFnLnN0YXJ0c1dpdGgoJ3Byb2plY3QvJyk7XG59XG5cbmludGVyZmFjZSBUYXNrRW50cnkge1xuICBkYXRlOiBzdHJpbmc7XG4gIHRhc2s6IFRhc2s7XG4gIG5vdGVQYXRoOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRQcm9qZWN0cyh2YXVsdDogVmF1bHQpOiBQcm9taXNlPFByb2plY3RbXT4ge1xuICBjb25zdCBkaWFyeUZpbGVzID0gc2NhbkRpYXJ5RmlsZXModmF1bHQpO1xuICBjb25zdCBkaWFyeVBhdGhzID0gbmV3IFNldChkaWFyeUZpbGVzLm1hcChmID0+IGYucGF0aCkpO1xuICBjb25zdCBwcm9qZWN0TWFwID0gbmV3IE1hcDxzdHJpbmcsIFRhc2tFbnRyeVtdPigpO1xuXG4gIC8vIEdldCBhbGwgbWFya2Rvd24gZmlsZXMsIHByb2Nlc3MgZGlhcnkgZmlsZXMgZmlyc3RcbiAgY29uc3QgYWxsRmlsZXMgPSB2YXVsdC5nZXRNYXJrZG93bkZpbGVzKCk7XG5cbiAgYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0ZpbGUoZmlsZTogVEZpbGUsIGlzRGlhcnk6IGJvb2xlYW4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdmF1bHQuY2FjaGVkUmVhZChmaWxlKTtcbiAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUZyb250bWF0dGVyKGNvbnRlbnQpO1xuICAgIGlmICghcGFyc2VkKSByZXR1cm47XG5cbiAgICBjb25zdCBkYXRlID0gZmlsZS5uYW1lLnJlcGxhY2UoL1xcLm1kJC8sICcnKTtcbiAgICBjb25zdCBub3RlUHJvamVjdFRhZ3MgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAgIC8vIEZyb20gdGFzayB0YWdzXG4gICAgZm9yIChjb25zdCB0YXNrIG9mIHBhcnNlZC50YXNrcykge1xuICAgICAgZm9yIChjb25zdCB0YWcgb2YgdGFzay50YWdzKSB7XG4gICAgICAgIGlmIChpc1Byb2plY3RUYWcodGFnKSkgbm90ZVByb2plY3RUYWdzLmFkZCh0YWcpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEZyb20gbm90ZS1sZXZlbCBmcm9udG1hdHRlciB0YWdzXG4gICAgY29uc3QgZm1NYXRjaCA9IGNvbnRlbnQubWF0Y2goL14tLS1cXG4oW1xcc1xcU10qPylcXG4tLS0vKTtcbiAgICBpZiAoZm1NYXRjaCkge1xuICAgICAgZm9yIChjb25zdCB0YWcgb2YgZXh0cmFjdE5vdGVUYWdzKGZtTWF0Y2hbMV0pKSB7XG4gICAgICAgIGlmIChpc1Byb2plY3RUYWcodGFnKSkgbm90ZVByb2plY3RUYWdzLmFkZCh0YWcpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEZyb20gYm9keSBpbmxpbmUgdGFnc1xuICAgIGZvciAoY29uc3QgdGFnIG9mIGV4dHJhY3RCb2R5VGFncyhwYXJzZWQuYm9keSkpIHtcbiAgICAgIGlmIChpc1Byb2plY3RUYWcodGFnKSkgbm90ZVByb2plY3RUYWdzLmFkZCh0YWcpO1xuICAgIH1cblxuICAgIC8vIEFzc29jaWF0ZSB0YXNrcyB0byBwcm9qZWN0c1xuICAgIGZvciAoY29uc3QgcHJvamVjdFRhZyBvZiBub3RlUHJvamVjdFRhZ3MpIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBwcm9qZWN0VGFnLnJlcGxhY2UoJ3Byb2plY3QvJywgJycpO1xuICAgICAgaWYgKCFwcm9qZWN0TWFwLmhhcyhuYW1lKSkgcHJvamVjdE1hcC5zZXQobmFtZSwgW10pO1xuXG4gICAgICBpZiAocGFyc2VkLnRhc2tzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZm9yIChjb25zdCB0YXNrIG9mIHBhcnNlZC50YXNrcykge1xuICAgICAgICAgIGNvbnN0IGV4aXN0aW5nID0gcHJvamVjdE1hcC5nZXQobmFtZSkhO1xuICAgICAgICAgIGlmICghZXhpc3Rpbmcuc29tZShlID0+IGUudGFzay5pZCA9PT0gdGFzay5pZCkpIHtcbiAgICAgICAgICAgIGV4aXN0aW5nLnB1c2goeyBkYXRlLCB0YXNrLCBub3RlUGF0aDogZmlsZS5wYXRoIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFByb2Nlc3MgZGlhcnkgZmlsZXNcbiAgZm9yIChjb25zdCBmaWxlIG9mIGRpYXJ5RmlsZXMpIHtcbiAgICBhd2FpdCBwcm9jZXNzRmlsZShmaWxlLCB0cnVlKTtcbiAgfVxuXG4gIC8vIFByb2Nlc3Mgbm9uLWRpYXJ5IGZpbGVzIHRoYXQgbWlnaHQgaGF2ZSBwcm9qZWN0IHRhZ3NcbiAgZm9yIChjb25zdCBmaWxlIG9mIGFsbEZpbGVzKSB7XG4gICAgaWYgKCFkaWFyeVBhdGhzLmhhcyhmaWxlLnBhdGgpKSB7XG4gICAgICBhd2FpdCBwcm9jZXNzRmlsZShmaWxlLCBmYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgcHJvamVjdHM6IFByb2plY3RbXSA9IFtdO1xuICBmb3IgKGNvbnN0IFtuYW1lLCBlbnRyaWVzXSBvZiBwcm9qZWN0TWFwKSB7XG4gICAgaWYgKGVudHJpZXMubGVuZ3RoID09PSAwKSBjb250aW51ZTtcbiAgICBjb25zdCBkYXRlcyA9IGVudHJpZXMubWFwKGUgPT4gZS5kYXRlKS5maWx0ZXIoQm9vbGVhbikuc29ydCgpO1xuICAgIGNvbnN0IGRvbmVDb3VudCA9IGVudHJpZXMuZmlsdGVyKGUgPT4gZS50YXNrLmRvbmUpLmxlbmd0aDtcbiAgICBjb25zdCB0YXNrV2l0aERlYWRsaW5lID0gZW50cmllcy5maW5kKGUgPT4gZS50YXNrLmRlYWRsaW5lKTtcblxuICAgIHByb2plY3RzLnB1c2goe1xuICAgICAgbmFtZSxcbiAgICAgIHRhZzogYHByb2plY3QvJHtuYW1lfWAsXG4gICAgICB0YXNrczogZW50cmllcyxcbiAgICAgIHN0YXJ0RGF0ZTogZGF0ZXNbMF0gfHwgdG9kYXlTdHIoKSxcbiAgICAgIGVuZERhdGU6IHRhc2tXaXRoRGVhZGxpbmU/LnRhc2suZGVhZGxpbmUgfHwgZGF0ZXNbZGF0ZXMubGVuZ3RoIC0gMV0gfHwgdG9kYXlTdHIoKSxcbiAgICAgIGRvbmVDb3VudCxcbiAgICAgIHRvdGFsQ291bnQ6IGVudHJpZXMubGVuZ3RoLFxuICAgIH0pO1xuICB9XG5cbiAgcHJvamVjdHMuc29ydCgoYSwgYikgPT4gYS5zdGFydERhdGUubG9jYWxlQ29tcGFyZShiLnN0YXJ0RGF0ZSkpO1xuICByZXR1cm4gcHJvamVjdHM7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVQcm9qZWN0KFxuICB2YXVsdDogVmF1bHQsXG4gIG5hbWU6IHN0cmluZyxcbiAgc3RhcnREYXRlOiBzdHJpbmcsXG4gIGVuZERhdGU6IHN0cmluZ1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHRhc2s6IFRhc2sgPSB7XG4gICAgaWQ6IGNyeXB0by5yYW5kb21VVUlEKCksXG4gICAgdGV4dDogYFByb2plY3Qgc3RhcnQ6ICR7bmFtZX1gLFxuICAgIGRvbmU6IGZhbHNlLFxuICAgIHByaW9yaXR5OiAnaGlnaCcsXG4gICAgdGFnczogW2Bwcm9qZWN0LyR7bmFtZX1gXSxcbiAgICBkZWFkbGluZTogZW5kRGF0ZSxcbiAgfTtcblxuICBjb25zdCBwYXRoID0gYFx1NjVFNVx1OEJCMC8ke3N0YXJ0RGF0ZX0ubWRgO1xuICBjb25zdCBmaWxlID0gdmF1bHQuZ2V0RmlsZUJ5UGF0aChwYXRoKTtcblxuICBpZiAoIWZpbGUpIHtcbiAgICBjb25zdCBjb250ZW50ID0gc2VyaWFsaXplRnJvbnRtYXR0ZXIoXG4gICAgICBbdGFza10sXG4gICAgICBgIyAke25hbWV9XFxuXFxuRnJvbSAke3N0YXJ0RGF0ZX0gdG8gJHtlbmREYXRlfVxcblxcblxcYFxcYFxcYG1lbW8tZ2FudHRcXG5wcm9qZWN0OiAke25hbWV9XFxuXFxgXFxgXFxgYFxuICAgICk7XG4gICAgYXdhaXQgdmF1bHQuY3JlYXRlKHBhdGgsIGNvbnRlbnQpO1xuICB9IGVsc2Uge1xuICAgIGF3YWl0IHZhdWx0LnByb2Nlc3MoZmlsZSwgKGNvbnRlbnQpID0+IHtcbiAgICAgIGNvbnN0IHdpdGhGbSA9IGVuc3VyZUZyb250bWF0dGVyKGNvbnRlbnQpO1xuICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VGcm9udG1hdHRlcih3aXRoRm0pO1xuICAgICAgY29uc3QgdGFza3MgPSBwYXJzZWQ/LnRhc2tzID8/IFtdO1xuICAgICAgdGFza3MucHVzaCh0YXNrKTtcbiAgICAgIGNvbnN0IGJvZHkgPSBwYXJzZWQ/LmJvZHkgPz8gJyc7XG4gICAgICBjb25zdCB1cGRhdGVkID0gZW5zdXJlRnJvbnRtYXR0ZXIoc2VyaWFsaXplRnJvbnRtYXR0ZXIodGFza3MsIGJvZHkpKTtcbiAgICAgIGNvbnN0IHRhZ0xpbmUgPSBgcHJvamVjdC8ke25hbWV9YDtcbiAgICAgIGlmICghdXBkYXRlZC5pbmNsdWRlcyh0YWdMaW5lKSkge1xuICAgICAgICByZXR1cm4gdXBkYXRlZC5yZXBsYWNlKC9eLS0tXFxuLywgYC0tLVxcbnRhZ3M6XFxuICAtIFwiJHt0YWdMaW5lfVwiXFxuYCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdXBkYXRlZDtcbiAgICB9KTtcbiAgfVxufVxuIiwgImltcG9ydCB7IFZhdWx0IH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgUHJvamVjdCwgdG9kYXlTdHIgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IGdldFByb2plY3RzIH0gZnJvbSAnLi9wcm9qZWN0TWFuYWdlcic7XG5cbi8qKiBSZW5kZXIgYSBHYW50dCBjaGFydCBpbnRvIGEgY29udGFpbmVyIGVsZW1lbnQgKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW5kZXJHYW50dENoYXJ0KFxuICBjb250YWluZXI6IEhUTUxFbGVtZW50LFxuICB2YXVsdDogVmF1bHQsXG4gIHByb2plY3RGaWx0ZXI/OiBzdHJpbmdcbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBhbGxQcm9qZWN0cyA9IGF3YWl0IGdldFByb2plY3RzKHZhdWx0KTtcbiAgY29uc3QgcHJvamVjdHMgPSBwcm9qZWN0RmlsdGVyXG4gICAgPyBhbGxQcm9qZWN0cy5maWx0ZXIocCA9PiBwLm5hbWUgPT09IHByb2plY3RGaWx0ZXIgfHwgcC50YWcgPT09IHByb2plY3RGaWx0ZXIpXG4gICAgOiBhbGxQcm9qZWN0cztcblxuICBpZiAocHJvamVjdHMubGVuZ3RoID09PSAwKSB7XG4gICAgY29udGFpbmVyLmNyZWF0ZURpdignbWMtZW1wdHktc3RhdGUnKS5zZXRUZXh0KFxuICAgICAgcHJvamVjdEZpbHRlciA/IGBObyBwcm9qZWN0IFwiJHtwcm9qZWN0RmlsdGVyfVwiIGZvdW5kLmAgOiAnTm8gcHJvamVjdHMgdG8gY2hhcnQuJ1xuICAgICk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gQ29tcHV0ZSBkYXRlIHJhbmdlIGFjcm9zcyBhbGwgcHJvamVjdHNcbiAgY29uc3QgdG9kYXkgPSB0b2RheVN0cigpO1xuICBsZXQgbWluRGF0ZSA9IHRvZGF5O1xuICBsZXQgbWF4RGF0ZSA9IHRvZGF5O1xuXG4gIGZvciAoY29uc3QgcCBvZiBwcm9qZWN0cykge1xuICAgIGlmIChwLnN0YXJ0RGF0ZSA8IG1pbkRhdGUpIG1pbkRhdGUgPSBwLnN0YXJ0RGF0ZTtcbiAgICBpZiAocC5lbmREYXRlID4gbWF4RGF0ZSkgbWF4RGF0ZSA9IHAuZW5kRGF0ZTtcbiAgfVxuXG4gIC8vIEVuc3VyZSBhdCBsZWFzdCAxNCBkYXlzIHJhbmdlXG4gIGNvbnN0IG1pbkQgPSBuZXcgRGF0ZShtaW5EYXRlKTtcbiAgY29uc3QgbWF4RCA9IG5ldyBEYXRlKG1heERhdGUpO1xuICBjb25zdCByYW5nZURheXMgPSBNYXRoLm1heChcbiAgICAobWF4RC5nZXRUaW1lKCkgLSBtaW5ELmdldFRpbWUoKSkgLyAoMTAwMCAqIDYwICogNjAgKiAyNCkgKyAxLFxuICAgIDE0XG4gICk7XG5cbiAgLy8gUGFkIGVuZCBkYXRlXG4gIGNvbnN0IHBhZGRlZEVuZCA9IG5ldyBEYXRlKG1pbkQpO1xuICBwYWRkZWRFbmQuc2V0RGF0ZShwYWRkZWRFbmQuZ2V0RGF0ZSgpICsgcmFuZ2VEYXlzKTtcbiAgY29uc3QgZW5kU3RyID0gcGFkZGVkRW5kLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApO1xuXG4gIGNvbnN0IGNoYXJ0ID0gY29udGFpbmVyLmNyZWF0ZURpdignbWMtZ2FudHQtY2hhcnQnKTtcblxuICAvLyBIZWFkZXIgcm93IHdpdGggbW9udGggbGFiZWxzXG4gIGNvbnN0IGhlYWRlclJvdyA9IGNoYXJ0LmNyZWF0ZURpdignbWMtZ2FudHQtaGVhZGVyLXJvdycpO1xuICBoZWFkZXJSb3cuY3JlYXRlRGl2KCdtYy1nYW50dC1sYWJlbC1jb2wnKS5zZXRUZXh0KCdQcm9qZWN0Jyk7XG5cbiAgY29uc3QgdGltZWxpbmVIZWFkZXIgPSBoZWFkZXJSb3cuY3JlYXRlRGl2KCdtYy1nYW50dC10aW1lbGluZS1jb2wnKTtcbiAgY29uc3QgdG90YWxEYXlzID0gcmFuZ2VEYXlzO1xuICBjb25zdCBkYXlXaWR0aCA9IE1hdGgubWF4KDI0LCBNYXRoLmZsb29yKDYwMCAvIHRvdGFsRGF5cykpO1xuXG4gIC8vIFRvZGF5IGluZGljYXRvciBwb3NpdGlvblxuICBjb25zdCB0b2RheVBvcyA9IE1hdGguZmxvb3IoXG4gICAgKG5ldyBEYXRlKHRvZGF5KS5nZXRUaW1lKCkgLSBtaW5ELmdldFRpbWUoKSkgLyAoMTAwMCAqIDYwICogNjAgKiAyNClcbiAgKTtcblxuICAvLyBEYXkgbGFiZWxzIChzaG93IGV2ZXJ5IGZldyBkYXlzKVxuICBmb3IgKGxldCBpID0gMDsgaSA8IHRvdGFsRGF5czsgaSsrKSB7XG4gICAgY29uc3QgZCA9IG5ldyBEYXRlKG1pbkQpO1xuICAgIGQuc2V0RGF0ZShkLmdldERhdGUoKSArIGkpO1xuICAgIGNvbnN0IGxhYmVsID0gZC5nZXREYXRlKCkgPT09IDEgfHwgaSA9PT0gMCB8fCBpID09PSB0b3RhbERheXMgLSAxXG4gICAgICA/IGAke2QuZ2V0TW9udGgoKSArIDF9LyR7ZC5nZXREYXRlKCl9YFxuICAgICAgOiAoZC5nZXREYXRlKCkgJSA1ID09PSAwID8gU3RyaW5nKGQuZ2V0RGF0ZSgpKSA6ICcnKTtcblxuICAgIGNvbnN0IGRheUNlbGwgPSB0aW1lbGluZUhlYWRlci5jcmVhdGVEaXYoJ21jLWdhbnR0LWRheS1jZWxsJyk7XG4gICAgZGF5Q2VsbC5zZXRUZXh0KGxhYmVsKTtcbiAgICBkYXlDZWxsLnN0eWxlLndpZHRoID0gYCR7ZGF5V2lkdGh9cHhgO1xuICB9XG5cbiAgLy8gVG9kYXkgbWFya2VyIGxpbmVcbiAgY29uc3QgbWFya2VyTGluZSA9IGNoYXJ0LmNyZWF0ZURpdignbWMtZ2FudHQtdG9kYXktbWFya2VyJyk7XG4gIG1hcmtlckxpbmUuc3R5bGUubGVmdCA9IGBjYWxjKDEyMHB4ICsgJHt0b2RheVBvcyAqIGRheVdpZHRofXB4KWA7XG4gIG1hcmtlckxpbmUuY3JlYXRlRGl2KCdtYy1nYW50dC10b2RheS1sYWJlbCcpLnNldFRleHQoJ1RvZGF5Jyk7XG5cbiAgLy8gUHJvamVjdCByb3dzXG4gIGZvciAoY29uc3QgcHJvamVjdCBvZiBwcm9qZWN0cykge1xuICAgIGNvbnN0IHJvdyA9IGNoYXJ0LmNyZWF0ZURpdignbWMtZ2FudHQtcm93Jyk7XG5cbiAgICAvLyBMYWJlbFxuICAgIGNvbnN0IGxhYmVsQ29sID0gcm93LmNyZWF0ZURpdignbWMtZ2FudHQtbGFiZWwtY29sJyk7XG4gICAgY29uc3QgcGN0ID0gcHJvamVjdC50b3RhbENvdW50ID4gMFxuICAgICAgPyBNYXRoLnJvdW5kKChwcm9qZWN0LmRvbmVDb3VudCAvIHByb2plY3QudG90YWxDb3VudCkgKiAxMDApXG4gICAgICA6IDA7XG4gICAgbGFiZWxDb2wuY3JlYXRlU3Bhbih7IHRleHQ6IHByb2plY3QubmFtZSwgY2xzOiAnbWMtZ2FudHQtcHJvamVjdC1uYW1lJyB9KTtcbiAgICBsYWJlbENvbC5jcmVhdGVTcGFuKHsgdGV4dDogYCR7cGN0fSVgLCBjbHM6ICdtYy1nYW50dC1wcm9qZWN0LXBjdCcgfSk7XG5cbiAgICAvLyBCYXIgYXJlYVxuICAgIGNvbnN0IGJhckFyZWEgPSByb3cuY3JlYXRlRGl2KCdtYy1nYW50dC10aW1lbGluZS1jb2wnKTtcblxuICAgIGNvbnN0IHByb2pTdGFydCA9IG5ldyBEYXRlKHByb2plY3Quc3RhcnREYXRlKTtcbiAgICBjb25zdCBwcm9qRW5kID0gbmV3IERhdGUocHJvamVjdC5lbmREYXRlKTtcblxuICAgIGNvbnN0IHN0YXJ0T2Zmc2V0ID0gTWF0aC5tYXgoMCxcbiAgICAgIE1hdGguZmxvb3IoKHByb2pTdGFydC5nZXRUaW1lKCkgLSBtaW5ELmdldFRpbWUoKSkgLyAoMTAwMCAqIDYwICogNjAgKiAyNCkpXG4gICAgKTtcbiAgICBjb25zdCBkdXJhdGlvbiA9IE1hdGgubWF4KDEsXG4gICAgICBNYXRoLmNlaWwoKHByb2pFbmQuZ2V0VGltZSgpIC0gcHJvalN0YXJ0LmdldFRpbWUoKSkgLyAoMTAwMCAqIDYwICogNjAgKiAyNCkpICsgMVxuICAgICk7XG5cbiAgICBjb25zdCBiYXIgPSBiYXJBcmVhLmNyZWF0ZURpdignbWMtZ2FudHQtYmFyJyk7XG4gICAgYmFyLnN0eWxlLm1hcmdpbkxlZnQgPSBgJHtzdGFydE9mZnNldCAqIGRheVdpZHRofXB4YDtcbiAgICBiYXIuc3R5bGUud2lkdGggPSBgJHtkdXJhdGlvbiAqIGRheVdpZHRoIC0gNH1weGA7XG5cbiAgICBpZiAocGN0ID09PSAxMDApIHtcbiAgICAgIGJhci5hZGRDbGFzcygnbWMtZ2FudHQtYmFyLWRvbmUnKTtcbiAgICB9IGVsc2UgaWYgKHByb2plY3QudGFza3Muc29tZSh0ID0+IHQuZGF0ZSA8IHRvZGF5ICYmICF0LnRhc2suZG9uZSkpIHtcbiAgICAgIGJhci5hZGRDbGFzcygnbWMtZ2FudHQtYmFyLW92ZXJkdWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYmFyLmFkZENsYXNzKCdtYy1nYW50dC1iYXItb250cmFjaycpO1xuICAgIH1cblxuICAgIC8vIEJhciBsYWJlbFxuICAgIGJhci5zZXRUZXh0KGAke3Byb2plY3Quc3RhcnREYXRlfSBcdTIxOTIgJHtwcm9qZWN0LmVuZERhdGV9YCk7XG5cbiAgICAvLyBEZWFkbGluZSBtYXJrZXIgaWYgc2V0XG4gICAgY29uc3QgdGFza1dpdGhEZWFkbGluZSA9IHByb2plY3QudGFza3MuZmluZCh0ID0+IHQudGFzay5kZWFkbGluZSk7XG4gICAgaWYgKHRhc2tXaXRoRGVhZGxpbmU/LnRhc2suZGVhZGxpbmUpIHtcbiAgICAgIGNvbnN0IGRsRGF0ZSA9IG5ldyBEYXRlKHRhc2tXaXRoRGVhZGxpbmUudGFzay5kZWFkbGluZSk7XG4gICAgICBjb25zdCBkbE9mZnNldCA9IE1hdGguZmxvb3IoXG4gICAgICAgIChkbERhdGUuZ2V0VGltZSgpIC0gbWluRC5nZXRUaW1lKCkpIC8gKDEwMDAgKiA2MCAqIDYwICogMjQpXG4gICAgICApO1xuICAgICAgY29uc3QgZGxNYXJrZXIgPSBiYXJBcmVhLmNyZWF0ZURpdignbWMtZ2FudHQtZGVhZGxpbmUnKTtcbiAgICAgIGRsTWFya2VyLnN0eWxlLm1hcmdpbkxlZnQgPSBgJHtkbE9mZnNldCAqIGRheVdpZHRoIC0gNH1weGA7XG4gICAgICBkbE1hcmtlci5zZXRBdHRyKCd0aXRsZScsIGBEZWFkbGluZTogJHt0YXNrV2l0aERlYWRsaW5lLnRhc2suZGVhZGxpbmV9YCk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUGFyc2UgY29kZSBibG9jayBjb250ZW50IGZvciBHYW50dCBjaGFydCBwYXJhbWV0ZXJzLlxuICogU3VwcG9ydGVkOiBgcHJvamVjdDogPG5hbWU+YCB0byBmaWx0ZXIgYnkgcHJvamVjdCBuYW1lLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VHYW50dEJsb2NrKHNvdXJjZTogc3RyaW5nKTogeyBwcm9qZWN0Pzogc3RyaW5nIH0ge1xuICBjb25zdCByZXN1bHQ6IHsgcHJvamVjdD86IHN0cmluZyB9ID0ge307XG4gIGZvciAoY29uc3QgbGluZSBvZiBzb3VyY2Uuc3BsaXQoJ1xcbicpKSB7XG4gICAgY29uc3QgbSA9IGxpbmUubWF0Y2goL15wcm9qZWN0OlxccyooLispJC8pO1xuICAgIGlmIChtKSB7XG4gICAgICByZXN1bHQucHJvamVjdCA9IG1bMV0udHJpbSgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFBQUEsbUJBQXNDOzs7QUNBdEMsSUFBQUMsbUJBQXVEOzs7QUNxQ2hELElBQU0scUJBQXFC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
