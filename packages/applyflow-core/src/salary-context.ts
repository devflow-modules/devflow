/**
 * A money figure is compensation only when its own sentence says so.
 * Company metrics (debt, revenue, funding, volume) and one-off stipends are not pay.
 */

export type SalaryAmountMention = {
  min: number;
  max: number;
  currency: "USD" | "unknown";
  extractedText: string;
  sentence: string;
};

const SALARY_CUE =
  /\b(?:salary|salaries|compensation|base pay|pay range|pay band|annual pay|ote|remunera\w*|salario|faixa salarial|per year|per annum|annually|a year|per month|monthly|per hour|hourly)\b|\/\s*(?:year|yr|month|mo|hour|hr)\b/i;

const NON_SALARY_CUE =
  /\b(?:debt|revenue|arr|funding|raised|valuation|market|transactions?|volume|loans?|lending|assets|gmv|household|savings|stipend|home[- ]office|setup|reimburse\w*|allowance|budget for|in sales|customers? (?:generate|earn)|billion|trillion)\b/i;

const AMOUNT = String.raw`(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k)?`;
const PERIOD_SUFFIX = String.raw`(?:\s*\/\s*(?:year|yr|month|mo|hour|hr))?`;
const DOLLAR_AMOUNT = new RegExp(
  String.raw`\$\s*${AMOUNT}${PERIOD_SUFFIX}(?:\s*usd)?(?:\s*(?:[-–—]|to)\s*\$?\s*${AMOUNT}${PERIOD_SUFFIX})?(?:\s*usd)?`,
  "gi",
);

function toNumber(raw: string | undefined, thousands: string | undefined): number | undefined {
  if (!raw) return undefined;
  const value = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(value)) return undefined;
  return thousands ? value * 1000 : value;
}

export function sentenceOf(text: string, index: number): string {
  return sentenceAround(text, index, 0);
}

function sentenceAround(text: string, index: number, length: number): string {
  const before = text.slice(0, index);
  const after = text.slice(index + length);
  const start = Math.max(before.lastIndexOf("\n"), before.search(/[.!?;][^.!?;]*$/)) + 1;
  const endMatch = after.search(/[\n!?;]|\.(?:\s|$)/);
  const end = endMatch === -1 ? text.length : index + length + endMatch;
  return text.slice(Math.max(0, start), end).trim();
}

/** Explicit-currency amounts still need to be free of company-metric context. */
export function isNonSalaryMoneyContext(sentence: string): boolean {
  return NON_SALARY_CUE.test(sentence) && !/\b(?:salary|compensation|base pay|pay range)\b/i.test(sentence);
}

export function findSalaryAmountMention(text: string): SalaryAmountMention | undefined {
  for (const match of text.matchAll(DOLLAR_AMOUNT)) {
    const index = match.index ?? 0;
    const sentence = sentenceAround(text, index, match[0].length);
    if (!SALARY_CUE.test(sentence) || isNonSalaryMoneyContext(sentence)) continue;
    const first = toNumber(match[1], match[2]);
    if (first === undefined) continue;
    const second = toNumber(match[3], match[4] ?? match[2]);
    return {
      min: first,
      max: second ?? first,
      currency: /\b(?:usd|us\$)\b|us\$/i.test(sentence) ? "USD" : "unknown",
      extractedText: match[0].replace(/\s+/g, " ").trim(),
      sentence,
    };
  }
  return undefined;
}
