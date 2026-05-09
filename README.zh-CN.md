<div align="center">

<p>
  <a href="README.md">English</a> |
  <a href="README.zh-CN.md">简体中文</a>
</p>

# Supermemo

<p>
  <strong>一款 Fantastical 风格的 Obsidian 智能备忘插件——把自然语言捕获、任务、项目、甘特图和跨平台提醒整合进同一条时间线。</strong>
</p>

<p>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green.svg"></a>
  <img alt="Obsidian" src="https://img.shields.io/badge/obsidian-%E2%9C%93-7c3aed.svg">
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-black.svg">
  <img alt="Local first" src="https://img.shields.io/badge/local--first-privacy--minded-5f4bb6.svg">
  <img alt="Modules" src="https://img.shields.io/badge/modules-tasks%20%7C%20projects%20%7C%20gantt%20%7C%20reminders-2c7a7b.svg">
</p>

<p>
  <a href="#快速开始">快速开始</a> |
  <a href="#功能概览">功能概览</a> |
  <a href="#演示">演示</a> |
  <a href="#项目集成">项目集成</a> |
  <a href="#提醒">提醒</a> |
  <a href="#架构">架构</a>
</p>

</div>

---

`supermemo` 是一款 Obsidian 插件，可以把日常笔记变成低阻力的记忆与任务中心。它能捕获 `下周二14:00打球，丘德拔体育馆` 这类自然语言，提取日期、时间、事件和地点，并将备忘保存到 `日记/YYYY-MM-DD.md`；同时也支持结构化任务、项目、甘特图和感知截止日期的系统通知。

核心原则：**自然书写，本地优先**。你已经在写的日记就是唯一真实来源。无需单独数据库、无需外部服务、无需账号。

<p align="center">
  <img src="docs/assets/obsidian-supermemo-screenshot.svg" alt="Supermemo 插件在 Obsidian 中运行，包含智能捕获、日历、任务和项目进度" width="1000">
</p>

---

## 功能概览

| 模块 | 插件能力 |
| :--- | :--- |
| **智能捕获** | 输入或选中 `下周二14:00打球，丘德拔体育馆` 这类自然语言；Supermemo 会提取日期、时间、事件和地点。 |
| **日历视图** | 月历网格，包含任务点提示、逾期标记和日期详情面板。 |
| **任务管理** | 可内联创建任务，支持优先级（高/中/低）、截止日期选择器、提醒计划、时间、地点和标签。 |
| **自定义复选框** | Apple 风格复选框，支持即时 ✓ 切换和删除线，无需整页刷新。 |
| **项目跟踪** | 按 `project/xxx` 标签自动归组任务。展示进度条、逾期数量和可展开任务列表。 |
| **甘特图** | 在 Projects 视图中展示横向条形时间线，也支持在日记里使用 ` ```memo-gantt` 代码块。 |
| **截止日期与提醒** | 为每个任务设置截止日期，并在支持的桌面平台上提前 1 天 / 3 天 / 1 周发送系统通知。 |
| **标签到项目链接** | 任意笔记只要在 frontmatter 中包含 `tags: project/xxx`，其中的任务都会自动关联到该项目。 |
| **全库扫描** | 扫描库中的所有 Markdown 文件以识别项目标签，不局限于日记文件夹。 |

---

## 快速开始

### 一行命令安装

```bash
bash -c 'for d in ~/Documents/*/.obsidian/plugins; do git clone https://github.com/zeyuShawn/supermemo.git "$d/supermemo" && exit; done'
```

这会在 `~/Documents` 下自动发现你的 Obsidian 库，并把插件克隆进去。

也可以手动安装：

```bash
cd /path/to/your-vault/.obsidian/plugins
git clone https://github.com/zeyuShawn/supermemo.git
```

然后：

1. 重启 Obsidian 或重新加载插件（Cmd+Shift+P → `Reload`）
2. 在 Settings → Community Plugins 中启用 **Supermemo**
3. 点击左侧日历图标，或从命令面板运行 `Open Supermemo`
4. 如果 `日记/` 文件夹不存在，插件会自动创建
5. 点击 `✨ Capture` 并输入一句自然语言，或从命令面板运行 `Smart Capture Memo`
6. 在任意笔记中选中文本，然后运行 `Smart Capture Memo from selection or current line`
7. 在日记笔记的 frontmatter 中添加 `tags: [project/myproject]` 来创建项目

无需任何配置。

---

## 产品流程

<p align="center">
  <img src="docs/assets/smart-capture-flow.svg" alt="智能捕获流程：自然语言到解析后的备忘，再到日记笔记" width="900">
</p>

Supermemo 面向研究者、办公人群和日常笔记者：他们不想在动笔前停下来选择一套结构。产品循环被刻意设计得很短：

1. **写出你的本意**——例如 `下周二14:00打球，丘德拔体育馆` 或 `next Friday 10am submit report @ office`。
2. **预览提取结果**——日期、时间、事件、地点和置信度。
3. **一次保存**——备忘会落到正确的日记文件中，并立即出现在日历/项目视图里。

支持的智能捕获模式包括：

| 模式 | 示例 |
| :--- | :--- |
| 相对日期 | `今天`, `明天`, `后天`, `today`, `tomorrow` |
| 星期 | `周二`, `下周二`, `next Tuesday`, `Friday` |
| 明确日期 | `2026-06-01`, `2026年6月1日`, `6/1` |
| 时间 | `14:00`, `下午2点`, `晚上7点半`, `2pm` |
| 地点 | `@实验室`, `，丘德拔体育馆`, `at office`, `在A301` |

<p align="center">
  <img src="docs/assets/product-architecture.svg" alt="Supermemo 产品架构" width="900">
</p>

## 演示

### 演示 1：无需格式化的智能捕获

```text
输入：下周二14:00打球，丘德拔体育馆

解析预览：
- 日期：下周二
- 时间：14:00
- 事件：打球
- 地点：丘德拔体育馆

→ 保存到匹配的 日记/YYYY-MM-DD.md 文件
→ 带着时间和地点标签立即出现在日历中
```

### 演示 2：添加带截止日期和提醒的任务

```text
1. 点击日历网格中的某一天
2. 点击 Tasks 区域里的 + 按钮
3. 输入 “Submit paper draft”
4. 选择优先级：High
5. 设置截止日期：2026-05-20
6. 设置提醒：提前 3 天
7. 点击 Add

→ 任务会显示在列表中，并带有 ⏰ 截止日期徽标和 🔔3d 提醒徽标
→ 在 5 月 20 日前 3 天，如平台支持，系统通知会触发："Task Reminder — 'Submit paper draft' is due in 3 days (2026-05-20)"
```

### 演示 3：从日记笔记创建项目

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

→ 切换到 Projects 视图：看到 “thesis” 卡片及 50% 进度条
→ 展开卡片：看到每个任务的日期、状态和截止日期
→ 向下滚动：甘特图会展示从第一个任务到截止日期的项目时间线

### 演示 4：在日记笔记中使用甘特图

````markdown
## Project Timeline

```memo-gantt
project: thesis
```
````

→ 代码块会在阅读视图中渲染交互式甘特图
→ 可按项目名过滤；也可以省略 `project:` 行来显示全部项目

---

## 项目集成

一篇笔记可以通过三种方式成为项目的一部分：

| 方式 | 示例 |
| :--- | :--- |
| **Frontmatter 标签** | `tags: [project/thesis]` —— 笔记本身被打上标签 |
| **任务标签** | 单个任务上的 `tags: [project/thesis]` |
| **正文内联标签** | 笔记正文中任意位置的 `#project/thesis` |

带有独立 `project/...` 标签的任务会关联到对应项目。项目标签笔记中的无标签任务会继承笔记级项目；因此项目笔记仍然易用，同时不会把已经显式打标签的任务错误复制到其他项目中。

支持的 YAML 标签格式：
- `tags: project/foo`
- `tags: [project/foo, project/bar]`
- `tags:\n  - project/foo\n  - project/bar`
- `tag: project/foo`

---

## 提醒

| 设置 | 行为 |
| :--- | :--- |
| **提前 1 天** | 在截止日期前 1 天触发通知 |
| **提前 3 天** | 在截止日期前 3 天触发通知 |
| **提前 1 周** | 在截止日期前 7 天触发通知 |

- 检查间隔：每 5 分钟
- 去重：每个提醒在同一次 Obsidian 会话中只触发一次
- 权限：插件加载时，如果 API 可用，会请求浏览器/Electron 通知权限
- 优雅降级：如果某个平台阻止或不支持通知，提醒会静默跳过

---

## 架构

```text
supermemo/
├── main.ts（插件入口）
│   ├── 注册 CalendarView（ItemView）
│   ├── 注册 memo-gantt 代码块处理器
│   ├── 注册智能捕获命令
│   └── 启动 5 分钟提醒检查循环
├── CalendarView.ts
│   ├── 日历网格（月视图）+ 日期详情面板
│   ├── 带进度条和任务展开的项目视图
│   ├── 甘特图集成
│   └── 内联任务/项目创建表单
├── SmartMemoParser.ts
│   └── 本地自然语言日期/时间/事件/地点解析器
├── SmartCaptureModal.ts
│   └── 零格式捕获弹窗，包含解析预览
├── taskManager.ts
│   ├── 日记 YAML frontmatter 的 CRUD 操作
│   └── 将工作日志条目追加到正文
├── projectManager.ts
│   ├── 全库项目标签扫描
│   └── 项目创建并自动插入甘特图块
├── GanttChart.ts
│   ├── 带今日标记的横向条形图渲染
│   └── 代码块参数解析
├── reminder.ts
│   ├── 感知截止日期的提醒检查器
│   └── 桌面 Notification API 集成与优雅降级
├── parser.ts
│   └── 带任务字段的 YAML frontmatter 解析/序列化
├── scanner.ts
│   └── 日记文件发现与分组
└── types.ts
    └── 共享 TypeScript 类型（Task、Project、CalendarState、ReminderOffset）
```

---

## 仓库结构

<details open>
<summary><strong>查看仓库树</strong></summary>

```text
supermemo/
├── README.md
├── README.zh-CN.md
├── LICENSE
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── styles.css
├── main.js                  （编译后的插件输出）
├── docs/
│   └── assets/              （README 图示）
└── src/
    ├── main.ts              （插件入口）
    ├── CalendarView.ts      （主 UI：日历、日期详情、项目）
    ├── SmartMemoParser.ts   （自然语言备忘解析器）
    ├── SmartCaptureModal.ts （智能捕获 UI）
    ├── taskManager.ts       （日记文件上的任务 CRUD）
    ├── projectManager.ts    （项目检测与创建）
    ├── GanttChart.ts        （甘特图渲染器）
    ├── reminder.ts          （提醒调度与通知）
    ├── parser.ts            （YAML frontmatter 解析器）
    ├── scanner.ts           （日记文件扫描器）
    └── types.ts             （TypeScript 类型和常量）
```

</details>

---

## 本地数据与隐私

- 所有数据都以纯 Markdown 文件形式存放在 Obsidian 库的 `日记/` 文件夹中
- 没有外部 API 调用、没有遥测、没有云同步
- 任务和项目状态存储在 YAML frontmatter 中，完全可读，也适合 Git 管理
- 提醒通知在可用时使用本地桌面 Notification API；如果被阻止或不支持，会优雅跳过

---

## 开发

```bash
# 安装依赖
npm install

# 开发构建（watch 模式）
npm run dev

# 生产构建
npm run build
```

---

## 许可证

MIT License。参见 [LICENSE](LICENSE)。

---

## 建议的 GitHub Topics

<details>
<summary><strong>查看建议 Topics</strong></summary>

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
