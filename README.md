<div align="center">

# Supermemo

<p>
  <strong>A Fantastical-style calendar memo plugin for Obsidian — tasks, projects, Gantt charts, and macOS notifications in one unified timeline.</strong>
</p>

<p>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green.svg"></a>
  <img alt="Obsidian" src="https://img.shields.io/badge/obsidian-%E2%9C%93-7c3aed.svg">
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-black.svg">
  <img alt="Local first" src="https://img.shields.io/badge/local--first-privacy--minded-5f4bb6.svg">
  <img alt="Modules" src="https://img.shields.io/badge/modules-tasks%20%7C%20projects%20%7C%20gantt%20%7C%20reminders-2c7a7b.svg">
</p>

<p>
  <a href="#quick-start">Quick Start</a> |
  <a href="#what-it-does">What It Does</a> |
  <a href="#demos">Demos</a> |
  <a href="#project-integration">Project Integration</a> |
  <a href="#reminders">Reminders</a> |
  <a href="#architecture">Architecture</a>
</p>

</div>

---

`supermemo` is an Obsidian plugin that turns your daily diary into a task-management hub. It reads YAML frontmatter from `日记/YYYY-MM-DD.md` files and renders a Fantastical-inspired calendar with inline task editing, project-level progress tracking, Gantt chart visualization, and deadline-aware system notifications.

Core principle: **diary-first, zero-config**. The diary you already write becomes the source of truth. No separate database, no external service, no account required.

---

## What It Does

| Area | What the plugin supports |
| :--- | :--- |
| **Calendar View** | Monthly grid with task-dot indicators, overdue markers, and day-detail panel. |
| **Task Management** | Inline task creation with priority (high/medium/low), deadline picker, and reminder scheduling. |
| **Custom Checkboxes** | Apple-style checkboxes with instant ✓ toggle and strikethrough — no full refresh needed. |
| **Project Tracking** | Auto-group tasks by `project/xxx` tags. Progress bars, overdue counts, expandable task lists. |
| **Gantt Chart** | Horizontal-bar timeline in the Projects view, plus ` ```memo-gantt` code blocks for diary notes. |
| **Deadline & Reminders** | Per-task deadline with 1-day / 3-day / 1-week advance macOS system notifications. |
| **Tag-to-Project Linking** | Any note with `tags: project/xxx` in frontmatter auto-links all its tasks to that project. |
| **Full-Vault Scanning** | Scans every markdown file in the vault for project tags — not limited to diary folder. |

---

## Quick Start

### One-liner install

```bash
bash -c 'for d in ~/Documents/*/.obsidian/plugins; do git clone https://github.com/zeyuShawn/supermemo.git "$d/supermemo" && exit; done'
```

This auto-discovers your Obsidian vault under `~/Documents` and clones the plugin into it.

Or manually:

```bash
cd /path/to/your-vault/.obsidian/plugins
git clone https://github.com/zeyuShawn/supermemo.git
```

Then:

1. Restart Obsidian or reload plugins (Cmd+Shift+P → `Reload`)
2. Enable **Supermemo** in Settings → Community Plugins
3. Click the calendar ribbon icon or run `Open Supermemo` from the command palette
4. The plugin auto-creates a `日记/` folder if it doesn't exist
5. Click any day → `+` → write a task → Add
6. Add `tags: [project/myproject]` to a diary note's frontmatter to create a project

No configuration needed.

---

## Demos

### Demo 1: Adding a task with deadline and reminder

```text
1. Click a day in the calendar grid
2. Click the + button in the Tasks section
3. Type "Submit paper draft"
4. Select priority: High
5. Set deadline: 2026-05-20
6. Set remind: 3 days before
7. Click Add

→ Task appears in the list with a ⏰ deadline badge and a 🔔3d reminder badge
→ 3 days before May 20, a macOS notification fires: "Task Reminder — 'Submit paper draft' is due in 3 days (2026-05-20)"
```

### Demo 2: Creating a project from a diary note

```yaml
---
tags:
  - project/thesis
tasks:
  - id: "abc123"
    text: "Send draft to advisor"
    done: false
    priority: high
    tags: [project/thesis]
    deadline: "2026-05-15"
    reminder: 1day
  - id: "def456"
    text: "Collect references"
    done: true
    priority: medium
    tags: [project/thesis]
---
# Thesis Progress

Today I finished the introduction and sent the draft.
```

→ Switch to Projects view: see "thesis" card with 50% progress bar
→ Expand the card: see each task with date, status, and deadline
→ Scroll down: Gantt chart shows project timeline from first task to deadline

### Demo 3: Gantt chart in a diary note

````markdown
## Project Timeline

```memo-gantt
project: thesis
```
````

→ The code block renders an interactive Gantt chart inside the reading view
→ Filter by project name, or omit the `project:` line to show all projects

---

## Project Integration

Three ways a note becomes part of a project:

| Method | Example |
| :--- | :--- |
| **Frontmatter tags** | `tags: [project/thesis]` — the note itself is tagged |
| **Task tags** | `tags: [project/thesis]` on individual tasks |
| **Body inline tags** | `#project/thesis` anywhere in the note body |

All tasks in a tagged note are automatically associated with the project. No manual linking needed.

Supported YAML tag formats:
- `tags: project/foo`
- `tags: [project/foo, project/bar]`
- `tags:\n  - project/foo\n  - project/bar`
- `tag: project/foo`

---

## Reminders

| Setting | Behavior |
| :--- | :--- |
| **1 day before** | Notification fires 1 day before the deadline |
| **3 days before** | Notification fires 3 days before the deadline |
| **1 week before** | Notification fires 7 days before the deadline |

- Check interval: every 5 minutes
- Deduplication: each reminder fires once per Obsidian session
- Permission: plugin requests macOS notification permission on load
- Graceful fallback: if notifications are blocked, reminders silently skip

---

## Architecture

```
supermemo/
├── main.ts (Plugin entry)
│   ├── Registers CalendarView (ItemView)
│   ├── Registers memo-gantt code block processor
│   └── Starts 5-minute reminder check loop
├── CalendarView.ts
│   ├── Calendar grid (monthly) + day detail panel
│   ├── Projects view with progress bars + task expansion
│   ├── Gantt chart integration
│   └── Inline task/project creation forms
├── taskManager.ts
│   ├── CRUD operations on diary YAML frontmatter
│   └── Body append for work-log entries
├── projectManager.ts
│   ├── Full-vault project tag scanning
│   └── Project creation with auto-inserted Gantt block
├── GanttChart.ts
│   ├── Horizontal bar rendering with today marker
│   └── Code block parameter parser
├── reminder.ts
│   ├── Deadline-aware reminder checker
│   └── macOS Notification API integration
├── parser.ts
│   └── YAML frontmatter parse/serialize with task fields
├── scanner.ts
│   └── Diary file discovery and grouping
└── types.ts
    └── Shared TypeScript types (Task, Project, CalendarState, ReminderOffset)
```

---

## Repository Layout

<details open>
<summary><strong>View Repository Tree</strong></summary>

```text
supermemo/
├── README.md
├── LICENSE
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── styles.css
├── main.js                  (compiled plugin output)
└── src/
    ├── main.ts              (plugin entry point)
    ├── CalendarView.ts      (main UI — calendar, day detail, projects)
    ├── taskManager.ts       (task CRUD on diary files)
    ├── projectManager.ts    (project detection and creation)
    ├── GanttChart.ts        (Gantt chart renderer)
    ├── reminder.ts          (reminder scheduler + notifications)
    ├── parser.ts            (YAML frontmatter parser)
    ├── scanner.ts           (diary file scanner)
    └── types.ts             (TypeScript types and constants)
```

</details>

---

## Local Data and Privacy

- All data lives in your Obsidian vault's `日记/` folder as plain Markdown files
- No external API calls, no telemetry, no cloud sync
- Task and project state is stored in YAML frontmatter — fully human-readable and git-friendly
- Reminder notifications are local macOS notifications only

---

## Development

```bash
# Install dependencies
npm install

# Dev build (watch mode)
npm run dev

# Production build
npm run build
```

---

## License

MIT License. See [LICENSE](LICENSE).

---

## Suggested GitHub Topics

<details>
<summary><strong>View Suggested Topics</strong></summary>

```text
obsidian
obsidian-plugin
calendar
task-management
project-management
gantt-chart
productivity
macos-notifications
local-first
privacy
typescript
diary
yaml
reminders
fantastical
```

</details>
