import { addDays, parseDateOnly, todayStr } from './types';

export interface SmartMemoParseResult {
  date: string;
  time?: string;
  title: string;
  location?: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  matched: string[];
}

const WEEKDAY_MAP: Record<string, number> = {
  日: 0,
  天: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function nextWeekday(base: Date, weekday: number): Date {
  const current = base.getDay();
  let delta = (weekday - current + 7) % 7;
  if (delta === 0) delta = 7;
  return addDays(base, delta);
}

function weekdayInNextWeek(base: Date, weekday: number): Date {
  const mondayIndex = (base.getDay() + 6) % 7;
  const targetMondayIndex = (weekday + 6) % 7;
  return addDays(base, 7 - mondayIndex + targetMondayIndex);
}

function normalizeHour(hour: number, marker?: string): number {
  const lower = marker?.toLowerCase();
  if (!lower) return hour;
  if ((lower === 'pm' || lower.includes('下午') || lower.includes('晚上')) && hour < 12) return hour + 12;
  if ((lower.includes('中午')) && hour < 11) return hour + 12;
  if ((lower === 'am' || lower.includes('上午') || lower.includes('早上')) && hour === 12) return 0;
  return hour;
}

function normalizeTime(hour: number, minute: number, marker?: string): string | undefined {
  const normalizedHour = normalizeHour(hour, marker);
  if (normalizedHour < 0 || normalizedHour > 23 || minute < 0 || minute > 59) return undefined;
  return `${String(normalizedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function consume(input: string, matchText: string, matched: string[]): string {
  if (!matchText) return input;
  matched.push(matchText.trim());
  return input.replace(matchText, ' ');
}

export function parseSmartMemo(input: string, baseDate = new Date()): SmartMemoParseResult {
  const source = input.trim();
  const matched: string[] = [];
  let working = source;
  let date = todayStr();
  let dateMatched = false;
  let time: string | undefined;
  let location: string | undefined;
  const base = startOfLocalDay(baseDate);

  const explicitDate = working.match(/\b(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})日?\b/);
  if (explicitDate) {
    date = formatDate(new Date(Number(explicitDate[1]), Number(explicitDate[2]) - 1, Number(explicitDate[3])));
    working = consume(working, explicitDate[0], matched);
    dateMatched = true;
  }

  if (!dateMatched) {
    const md = working.match(/(?:^|\s)(\d{1,2})[/-](\d{1,2})(?:\s|$)/);
    if (md) {
      const year = base.getFullYear();
      date = formatDate(new Date(year, Number(md[1]) - 1, Number(md[2])));
      working = consume(working, md[0], matched);
      dateMatched = true;
    }
  }

  if (!dateMatched) {
    const relativeRules: Array<[RegExp, number]> = [
      [/(今天|今日|today)/i, 0],
      [/(明天|tomorrow)/i, 1],
      [/(后天|後天|day after tomorrow)/i, 2],
    ];
    for (const [re, offset] of relativeRules) {
      const m = working.match(re);
      if (m) {
        date = formatDate(addDays(base, offset));
        working = consume(working, m[0], matched);
        dateMatched = true;
        break;
      }
    }
  }

  if (!dateMatched) {
    const zhWeekday = working.match(/(下周|下星期|下礼拜|周|星期|礼拜)([一二三四五六日天])/);
    if (zhWeekday) {
      const weekday = WEEKDAY_MAP[zhWeekday[2]];
      date = formatDate(zhWeekday[1].startsWith('下') ? weekdayInNextWeek(base, weekday) : nextWeekday(base, weekday));
      working = consume(working, zhWeekday[0], matched);
      dateMatched = true;
    }
  }

  if (!dateMatched) {
    const enWeekday = working.match(/\b(next\s+)?(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i);
    if (enWeekday) {
      const weekday = WEEKDAY_MAP[enWeekday[2].toLowerCase()];
      date = formatDate(enWeekday[1] ? weekdayInNextWeek(base, weekday) : nextWeekday(base, weekday));
      working = consume(working, enWeekday[0], matched);
      dateMatched = true;
    }
  }

  const colonTime = working.match(/(上午|早上|下午|晚上|中午)?\s*(\d{1,2})[:：](\d{2})\s*(am|pm)?/i);
  if (colonTime) {
    time = normalizeTime(Number(colonTime[2]), Number(colonTime[3]), colonTime[1] || colonTime[4]);
    working = consume(working, colonTime[0], matched);
  } else {
    const zhTime = working.match(/(上午|早上|下午|晚上|中午)?\s*(\d{1,2})[点時时](半|\d{1,2}分?)?/);
    if (zhTime) {
      const minute = zhTime[3] === '半' ? 30 : Number((zhTime[3] || '0').replace('分', ''));
      time = normalizeTime(Number(zhTime[2]), minute, zhTime[1]);
      working = consume(working, zhTime[0], matched);
    } else {
      const enTime = working.match(/\b(\d{1,2})\s*(am|pm)\b/i);
      if (enTime) {
        time = normalizeTime(Number(enTime[1]), 0, enTime[2]);
        working = consume(working, enTime[0], matched);
      }
    }
  }

  const explicitLocation = working.match(/(?:@|＠)\s*([^,，;；\n]+)/);
  if (explicitLocation) {
    location = explicitLocation[1].trim();
    working = consume(working, explicitLocation[0], matched);
  } else {
    const delimiterLocation = working.match(/[，,]\s*([^，,;；\n]+)\s*$/);
    if (delimiterLocation) {
      location = delimiterLocation[1].trim();
      working = working.slice(0, delimiterLocation.index).trim();
      matched.push(delimiterLocation[0].trim());
    } else {
      const atLocation = working.match(/\b(?:at|in)\s+([^,，;；\n]+)$/i);
      if (atLocation) {
        location = atLocation[1].trim();
        working = consume(working, atLocation[0], matched);
      } else {
        const zhLocation = working.match(/在([^,，;；\n]+)$/);
        if (zhLocation && working.slice(0, zhLocation.index).trim().length > 0) {
          location = zhLocation[1].trim();
          working = consume(working, zhLocation[0], matched);
        }
      }
    }
  }

  const title = working
    .replace(/[，,;；。.!！?？]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim() || source;

  const confidence = dateMatched && time && title !== source ? 'high' : (dateMatched || time ? 'medium' : 'low');

  return {
    date,
    time,
    title,
    location,
    source,
    confidence,
    matched,
  };
}

export function formatSmartMemoPreview(result: SmartMemoParseResult): string {
  const bits = [result.date];
  if (result.time) bits.push(result.time);
  bits.push(result.title);
  if (result.location) bits.push(`@ ${result.location}`);
  return bits.join(' · ');
}
