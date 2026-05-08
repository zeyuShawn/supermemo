export type ReminderOffset = '1day' | '3days' | '1week';

export interface Task {
  id: string;
  text: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  deadline?: string;
  reminder?: ReminderOffset;
}

export interface DayData {
  date: string;
  path: string;
  tasks: Task[];
  body: string;
}

export interface CalendarState {
  currentYear: number;
  currentMonth: number;
  selectedDate: string | null;
}

export interface Project {
  name: string;
  tag: string;
  tasks: { date: string; task: Task }[];
  startDate: string;
  endDate: string;
  doneCount: number;
  totalCount: number;
}

export type ViewMode = 'calendar' | 'projects';

export const VIEW_TYPE_CALENDAR = 'supermemo-view';

export const DIARY_FOLDER = '日记';

export const PRIORITY_COLORS: Record<string, string> = {
  high: '#ff6b6b',
  medium: '#ffd93d',
  low: '#6bcf7f',
};

export function generateId(): string {
  return crypto.randomUUID();
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
