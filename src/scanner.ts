import { Vault, TFile } from 'obsidian';
import { DIARY_FOLDER } from './types';

const DIARY_RE = /^\d{4}-\d{2}-\d{2}\.md$/;

/**
 * Scan the vault for diary files. Returns vault-relative paths.
 */
export function scanDiaryFiles(vault: Vault): TFile[] {
  const folder = vault.getFolderByPath(DIARY_FOLDER);
  if (!folder) return [];
  const files = (folder as any).children?.filter(
    (f: any) => f instanceof TFile && DIARY_RE.test(f.name)
  ) || [];
  return files as TFile[];
}

/**
 * Get the vault-relative path for a given date.
 */
export function diaryPath(date: string): string {
  return `${DIARY_FOLDER}/${date}.md`;
}

/**
 * Ensure the diary folder exists. Called on plugin init.
 */
export async function ensureDiaryFolder(vault: Vault): Promise<void> {
  const exists = vault.getFolderByPath(DIARY_FOLDER);
  if (!exists) {
    await vault.createFolder(DIARY_FOLDER);
  }
}

/**
 * Group diary files by month: returns Map<"YYYY-MM", TFile[]>
 */
export function groupByMonth(files: TFile[]): Map<string, TFile[]> {
  const map = new Map<string, TFile[]>();
  for (const file of files) {
    const name = file.name; // YYYY-MM-DD.md
    const month = name.slice(0, 7); // YYYY-MM
    if (!map.has(month)) map.set(month, []);
    map.get(month)!.push(file);
  }
  return map;
}

/**
 * Get the set of dates (days of month) that have diary files for a given month.
 * Returns Set of day numbers (1-31) that exist.
 */
export function daysWithEntries(files: TFile[], year: number, month: number): Set<number> {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const days = new Set<number>();
  for (const file of files) {
    if (file.name.startsWith(prefix)) {
      const day = parseInt(file.name.slice(8, 10), 10);
      if (!isNaN(day)) days.add(day);
    }
  }
  return days;
}
