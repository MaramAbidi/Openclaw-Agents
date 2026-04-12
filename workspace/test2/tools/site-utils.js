const SITE_CODE_MAP = new Map([
  ["bouargoub", "BAR"],
  ["bareket el sehel", "BKS"],
  ["sahline", "SAL"],
  ["gabes", "GAB"],
  ["sfax", "SFX"],
  ["sfaz", "SFX"],
  ["tunis", "TUN"],
]);

function normalizeKey(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function normalizeSiteInput(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  const normalized = normalizeKey(trimmed);
  const mapped = SITE_CODE_MAP.get(normalized);
  if (mapped) return mapped;

  const upper = trimmed.toUpperCase();
  if (SITE_CODE_MAP.has(upper.toLowerCase())) return upper;

  return trimmed;
}
