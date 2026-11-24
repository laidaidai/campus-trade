/**
 * 通用参数边界工具。控制器里不能把 parseInt 的 NaN 或超大分页直接传给 SQL。
 */
export const toPositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const toNonNegativeInt = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

export const parsePagination = (
  limitRaw: unknown,
  offsetRaw: unknown,
  defaultLimit = 20
): { limit: number; offset: number } => {
  const limitValue = Number(limitRaw);
  const limit = Number.isInteger(limitValue)
    ? Math.min(100, Math.max(1, limitValue))
    : defaultLimit;
  const offset = toNonNegativeInt(offsetRaw, 0);
  return { limit, offset };
};

export const trimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';
