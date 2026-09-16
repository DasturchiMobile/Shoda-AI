export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function fmtPrice(v: number | string, currency = "UZS") {
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return `— ${currency}`;
  return `${n.toLocaleString("uz-UZ")} ${currency}`;
}
