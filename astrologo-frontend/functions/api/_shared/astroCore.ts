export interface AstroInfo {
  nome: string;
  decanato: number;
}

export const TATWA_ORDER = ['Akasha (Éter)', 'Vayu (Ar)', 'Tejas (Fogo)', 'Apas (Água)', 'Prithvi (Terra)'] as const;

export interface TatwaResult {
  principal: string;
  sub: string;
  principalIndex: number;
  subIndex: number;
}

export const isValidDateString = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y = 0, m = 0, d = 0] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

export const isValidTimeString = (value: string): boolean => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);

export const toHourMinute = (value: string, fallbackH: number, fallbackM: number): [number, number] => {
  const match = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return [fallbackH, fallbackM];
  return [Number(match[1] ?? fallbackH), Number(match[2] ?? fallbackM)];
};

export const wrapDegrees = (deg: number): number => ((deg % 360) + 360) % 360;

export const getJulianDate = (y: number, m: number, d: number, h: number, min: number): number => {
  let year = y;
  let month = m;
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + d + (h + min / 60) / 24 + B - 1524.5;
};

export const reduceNum = (n: number | string): number => {
  let sum = String(n)
    .replace(/\D/g, '')
    .split('')
    .reduce((acc, digit) => acc + parseInt(digit, 10), 0);

  while (sum > 9 && ![11, 22, 33].includes(sum)) {
    sum = sum
      .toString()
      .split('')
      .reduce((acc, digit) => acc + parseInt(digit, 10), 0);
  }

  return sum;
};

export const calcExpressionNumber = (input: string): number => {
  let sum = 0;
  const map: Record<string, number> = {
    a: 1,
    j: 1,
    s: 1,
    b: 2,
    k: 2,
    t: 2,
    c: 3,
    l: 3,
    u: 3,
    d: 4,
    m: 4,
    v: 4,
    e: 5,
    n: 5,
    w: 5,
    f: 6,
    o: 6,
    x: 6,
    g: 7,
    p: 7,
    y: 7,
    h: 8,
    q: 8,
    z: 8,
    i: 9,
    r: 9,
  };

  input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .forEach((word) => {
      let wordSum = 0;
      for (const char of word) {
        if (map[char]) wordSum += map[char];
      }
      sum += reduceNum(wordSum);
    });

  return reduceNum(sum);
};

export const getTatwaAtMoment = (
  hour: number,
  minute: number,
  sunriseHour: number,
  sunriseMinute: number,
): TatwaResult => {
  const nowMins = hour * 60 + minute;
  const sunriseMins = sunriseHour * 60 + sunriseMinute;
  const minsFromSunrise = (((nowMins - sunriseMins) % 1440) + 1440) % 1440;

  const principalIndex = Math.floor(minsFromSunrise / 24) % 5;
  const withinPrincipal = minsFromSunrise % 24;
  const subOffset = Math.floor(withinPrincipal / 4.8);
  const subIndex = (principalIndex + subOffset) % 5;

  return {
    principal: TATWA_ORDER[principalIndex] ?? 'Akasha (Éter)',
    sub: TATWA_ORDER[subIndex] ?? 'Akasha (Éter)',
    principalIndex,
    subIndex,
  };
};
