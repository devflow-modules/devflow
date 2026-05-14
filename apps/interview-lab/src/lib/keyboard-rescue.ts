/**
 * Keyboard Rescue Kit — símbolos, snippets e checklist (Sprint 0.6).
 * Dados estáticos para cópia rápida durante live coding.
 */

export type KeyboardRescueSymbolCategory =
  | "Logic operators"
  | "Brackets"
  | "Comparisons"
  | "Quotes"
  | "Punctuation"
  | "JavaScript syntax";

export type RescueSymbolItem = {
  id: string;
  label: string;
  value: string;
  description: string;
  category: KeyboardRescueSymbolCategory;
};

export const KEYBOARD_RESCUE_SYMBOL_CATEGORIES: readonly KeyboardRescueSymbolCategory[] = [
  "Logic operators",
  "Brackets",
  "Comparisons",
  "Quotes",
  "Punctuation",
  "JavaScript syntax",
] as const;

/** Símbolos individuais (copy-friendly). */
export const KEYBOARD_RESCUE_SYMBOLS: readonly RescueSymbolItem[] = [
  { id: "sym-pipe", label: "|", value: "|", description: "Pipe (bitwise OR / union types).", category: "Logic operators" },
  { id: "sym-or-or", label: "||", value: "||", description: "Logical OR (short-circuit).", category: "Logic operators" },
  { id: "sym-and-and", label: "&&", value: "&&", description: "Logical AND (short-circuit).", category: "Logic operators" },
  { id: "sym-brace-open", label: "{", value: "{", description: "Open brace — object blocks.", category: "Brackets" },
  { id: "sym-brace-close", label: "}", value: "}", description: "Close brace.", category: "Brackets" },
  { id: "sym-bracket-open", label: "[", value: "[", description: "Open bracket — arrays.", category: "Brackets" },
  { id: "sym-bracket-close", label: "]", value: "]", description: "Close bracket.", category: "Brackets" },
  { id: "sym-paren-open", label: "(", value: "(", description: "Open parenthesis.", category: "Brackets" },
  { id: "sym-paren-close", label: ")", value: ")", description: "Close parenthesis.", category: "Brackets" },
  { id: "sym-ne", label: "!==", value: "!==", description: "Strict inequality.", category: "Comparisons" },
  { id: "sym-eq", label: "===", value: "===", description: "Strict equality.", category: "Comparisons" },
  { id: "sym-lte", label: "<=", value: "<=", description: "Less than or equal.", category: "Comparisons" },
  { id: "sym-gte", label: ">=", value: ">=", description: "Greater than or equal.", category: "Comparisons" },
  { id: "sym-backtick", label: "`", value: "`", description: "Template literal / backtick.", category: "Quotes" },
  { id: "sym-single", label: "'", value: "'", description: "Single quote string.", category: "Quotes" },
  { id: "sym-double", label: '"', value: '"', description: "Double quote string.", category: "Quotes" },
  { id: "sym-semicolon", label: ";", value: ";", description: "Statement terminator.", category: "Punctuation" },
  { id: "sym-colon", label: ":", value: ":", description: "Ternary / labels / object keys.", category: "Punctuation" },
  { id: "sym-question", label: "?", value: "?", description: "Ternary / optional chaining.", category: "Punctuation" },
  { id: "sym-dot", label: ".", value: ".", description: "Property access / decimals.", category: "Punctuation" },
  { id: "sym-comma", label: ",", value: ",", description: "Separator.", category: "Punctuation" },
  { id: "sym-backslash", label: "\\", value: "\\", description: "Escape in strings / paths.", category: "Punctuation" },
  { id: "sym-slash", label: "/", value: "/", description: "Division / regex literal.", category: "Punctuation" },
  { id: "sym-arrow", label: "=>", value: "=>", description: "Arrow function.", category: "JavaScript syntax" },
] as const;

export type KeyboardSafeSnippet = {
  id: string;
  title: string;
  description: string;
  code: string;
  /** Padrão de uso (ex.: evitar `||` com mapas). */
  pattern?: string;
};

export const KEYBOARD_SAFE_SNIPPETS: readonly KeyboardSafeSnippet[] = [
  {
    id: "snippet-frequency-map-no-or-or",
    title: "Frequency map without ||",
    description: "Increment counts without relying on falsy shortcuts.",
    pattern: "Avoid `map.get(k) || 0` when 0 is a valid count.",
    code: `const current = map.has(item) ? map.get(item) : 0;
map.set(item, current + 1);`,
  },
  {
    id: "snippet-tie-breaker",
    title: "Tie-breaker sort",
    description: "Stable secondary key when primary counts match.",
    pattern: "Sort by count, then by id.",
    code: `if (b.count !== a.count) {
  return b.count - a.count;
}

return b.id - a.id;`,
  },
  {
    id: "snippet-entries-sort",
    title: "Array entries sort",
    description: "Sort Map entries by value then key.",
    pattern: "Map → entries → sort → keys.",
    code: `return [...count.entries()]
  .sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }

    return b[0] - a[0];
  })
  .map(([id]) => id);`,
  },
  {
    id: "snippet-async-fetch-json",
    title: "Async try / catch (fetch + JSON)",
    description: "Basic safe JSON parse from fetch.",
    code: `try {
  const response = await fetch(url);
  return await response.json();
} catch (error) {
  return null;
}`,
  },
  {
    id: "snippet-safe-default-map",
    title: "Safe default without ||",
    description: "Read from Map with explicit fallback.",
    pattern: "Use `map.has(key)` instead of `map.get(key) || default`.",
    code: `const value = map.has(key) ? map.get(key) : defaultValue;`,
  },
] as const;

export type KeyboardChecklistItem = {
  id: string;
  label: string;
  symbolValue?: string;
  description: string;
};

export const KEYBOARD_CHECKLIST_ITEMS: readonly KeyboardChecklistItem[] = [
  {
    id: "kbd-pipe",
    label: "I can type pipe: |",
    symbolValue: "|",
    description: "Common in unions, OR, and pipelines.",
  },
  {
    id: "kbd-braces",
    label: "I can type braces: { }",
    symbolValue: "{}",
    description: "Objects, blocks, and destructuring.",
  },
  {
    id: "kbd-brackets",
    label: "I can type brackets: [ ]",
    symbolValue: "[]",
    description: "Arrays and indexing.",
  },
  {
    id: "kbd-arrow",
    label: "I can type arrow: =>",
    symbolValue: "=>",
    description: "Arrow functions and concise returns.",
  },
  {
    id: "kbd-quotes",
    label: "I can type quotes: ' \" `",
    description: "Strings and template literals.",
  },
  {
    id: "kbd-copy-emergency",
    label: "I know how to copy emergency symbols",
    description: "Use this kit instead of freezing when a key fails.",
  },
  {
    id: "kbd-freq-snippet",
    label: "I know the keyboard-safe frequency map snippet",
    description: "Prefer `map.has` + explicit zero over `||` defaults.",
  },
] as const;

/** Botões rápidos em “I can’t type this symbol”. */
export const EMERGENCY_SYMBOL_VALUES: readonly string[] = [
  "|",
  "||",
  "&&",
  "\\",
  "{}",
  "[]",
  "=>",
  "!==",
  "===",
] as const;

export function symbolsGroupedByCategory(): Record<KeyboardRescueSymbolCategory, RescueSymbolItem[]> {
  const out = {} as Record<KeyboardRescueSymbolCategory, RescueSymbolItem[]>;
  for (const c of KEYBOARD_RESCUE_SYMBOL_CATEGORIES) {
    out[c] = [];
  }
  for (const s of KEYBOARD_RESCUE_SYMBOLS) {
    out[s.category].push(s);
  }
  return out;
}
