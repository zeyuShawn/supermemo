import { Vault } from 'obsidian';
import { Project, todayStr } from './types';
import { getProjects } from './projectManager';

/** Render a Gantt chart into a container element */
export async function renderGanttChart(
  container: HTMLElement,
  vault: Vault,
  projectFilter?: string
): Promise<void> {
  const allProjects = await getProjects(vault);
  const projects = projectFilter
    ? allProjects.filter(p => p.name === projectFilter || p.tag === projectFilter)
    : allProjects;

  if (projects.length === 0) {
    container.createDiv('mc-empty-state').setText(
      projectFilter ? `No project "${projectFilter}" found.` : 'No projects to chart.'
    );
    return;
  }

  // Compute date range across all projects
  const today = todayStr();
  let minDate = today;
  let maxDate = today;

  for (const p of projects) {
    if (p.startDate < minDate) minDate = p.startDate;
    if (p.endDate > maxDate) maxDate = p.endDate;
  }

  // Ensure at least 14 days range
  const minD = new Date(minDate);
  const maxD = new Date(maxDate);
  const rangeDays = Math.max(
    (maxD.getTime() - minD.getTime()) / (1000 * 60 * 60 * 24) + 1,
    14
  );

  // Pad end date
  const paddedEnd = new Date(minD);
  paddedEnd.setDate(paddedEnd.getDate() + rangeDays);
  const endStr = paddedEnd.toISOString().slice(0, 10);

  const chart = container.createDiv('mc-gantt-chart');

  // Header row with month labels
  const headerRow = chart.createDiv('mc-gantt-header-row');
  headerRow.createDiv('mc-gantt-label-col').setText('Project');

  const timelineHeader = headerRow.createDiv('mc-gantt-timeline-col');
  const totalDays = rangeDays;
  const dayWidth = Math.max(24, Math.floor(600 / totalDays));

  // Today indicator position
  const todayPos = Math.floor(
    (new Date(today).getTime() - minD.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Day labels (show every few days)
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(minD);
    d.setDate(d.getDate() + i);
    const label = d.getDate() === 1 || i === 0 || i === totalDays - 1
      ? `${d.getMonth() + 1}/${d.getDate()}`
      : (d.getDate() % 5 === 0 ? String(d.getDate()) : '');

    const dayCell = timelineHeader.createDiv('mc-gantt-day-cell');
    dayCell.setText(label);
    dayCell.style.width = `${dayWidth}px`;
  }

  // Today marker line
  const markerLine = chart.createDiv('mc-gantt-today-marker');
  markerLine.style.left = `calc(120px + ${todayPos * dayWidth}px)`;
  markerLine.createDiv('mc-gantt-today-label').setText('Today');

  // Project rows
  for (const project of projects) {
    const row = chart.createDiv('mc-gantt-row');

    // Label
    const labelCol = row.createDiv('mc-gantt-label-col');
    const pct = project.totalCount > 0
      ? Math.round((project.doneCount / project.totalCount) * 100)
      : 0;
    labelCol.createSpan({ text: project.name, cls: 'mc-gantt-project-name' });
    labelCol.createSpan({ text: `${pct}%`, cls: 'mc-gantt-project-pct' });

    // Bar area
    const barArea = row.createDiv('mc-gantt-timeline-col');

    const projStart = new Date(project.startDate);
    const projEnd = new Date(project.endDate);

    const startOffset = Math.max(0,
      Math.floor((projStart.getTime() - minD.getTime()) / (1000 * 60 * 60 * 24))
    );
    const duration = Math.max(1,
      Math.ceil((projEnd.getTime() - projStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

    const bar = barArea.createDiv('mc-gantt-bar');
    bar.style.marginLeft = `${startOffset * dayWidth}px`;
    bar.style.width = `${duration * dayWidth - 4}px`;

    if (pct === 100) {
      bar.addClass('mc-gantt-bar-done');
    } else if (project.tasks.some(t => t.date < today && !t.task.done)) {
      bar.addClass('mc-gantt-bar-overdue');
    } else {
      bar.addClass('mc-gantt-bar-ontrack');
    }

    // Bar label
    bar.setText(`${project.startDate} → ${project.endDate}`);

    // Deadline marker if set
    const taskWithDeadline = project.tasks.find(t => t.task.deadline);
    if (taskWithDeadline?.task.deadline) {
      const dlDate = new Date(taskWithDeadline.task.deadline);
      const dlOffset = Math.floor(
        (dlDate.getTime() - minD.getTime()) / (1000 * 60 * 60 * 24)
      );
      const dlMarker = barArea.createDiv('mc-gantt-deadline');
      dlMarker.style.marginLeft = `${dlOffset * dayWidth - 4}px`;
      dlMarker.setAttr('title', `Deadline: ${taskWithDeadline.task.deadline}`);
    }
  }
}

/**
 * Parse code block content for Gantt chart parameters.
 * Supported: `project: <name>` to filter by project name.
 */
export function parseGanttBlock(source: string): { project?: string } {
  const result: { project?: string } = {};
  for (const line of source.split('\n')) {
    const m = line.match(/^project:\s*(.+)$/);
    if (m) {
      result.project = m[1].trim();
    }
  }
  return result;
}
