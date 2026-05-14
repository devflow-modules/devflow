import type { ProblemDefinition, ProblemPattern, TestOutcome } from "@/lib/types";

function byPattern(): Record<ProblemPattern, ProblemDefinition[]> {
  const map: Record<ProblemPattern, ProblemDefinition[]> = {
    "Frequency Map": [],
    "Sorting + Tie-breaker": [],
    "Two Pointers": [],
    "Async JavaScript": [],
    "Frontend Logic": [],
  };
  for (const p of PROBLEMS) {
    map[p.pattern].push(p);
  }
  return map;
}

export const PROBLEMS: ProblemDefinition[] = [
  {
    id: "most-frequent-category",
    title: "Most Frequent Category",
    difficulty: "Easy",
    pattern: "Frequency Map",
    prompt:
      "You are given an array of purchase records. Each record has a `category` string. Return the category that appears most often. If there is a tie, return the lexicographically smallest category.",
    examples: [
      {
        input: '[{ category: "books" }, { category: "games" }, { category: "books" }]',
        output: '"books"',
        explanation: '"books" appears twice.',
      },
    ],
    constraints: [
      "1 ≤ records.length ≤ 10^5",
      "Each category is a non-empty string of lowercase letters.",
    ],
    starterCode: `/**
 * @param { { category: string }[] } records
 * @returns { string }
 */
function solve(records) {
  // TODO
}
`,
    testCases: [
      {
        id: "basic",
        input: [[{ category: "a" }, { category: "b" }, { category: "a" }]],
        expected: "a",
      },
      {
        id: "tie-lex",
        input: [[{ category: "z" }, { category: "m" }, { category: "m" }, { category: "z" }]],
        expected: "m",
      },
      {
        id: "single",
        input: [[{ category: "solo" }]],
        expected: "solo",
      },
    ],
    idealApproach:
      "Use a Map or object to count frequencies, track the best candidate with (count desc, category asc) tie-break when updating.",
    complexity: "O(n) time, O(u) extra space for u unique categories.",
  },
  {
    id: "top-k-products",
    title: "Top K Products",
    difficulty: "Medium",
    pattern: "Frequency Map",
    prompt:
      "Given an array of products `{ id: string, score: number }` and an integer `k`, return the ids of the `k` highest-scoring products. Sort by `score` descending; when scores tie, sort by `id` ascending.",
    examples: [
      {
        input: '[{id:"a",score:2},{id:"b",score:2},{id:"c",score:1}], k=1',
        output: '["a"]',
        explanation: "Highest score is 2; tie-break id ascending picks `a` before `b`.",
      },
    ],
    constraints: ["1 ≤ k ≤ products.length ≤ 10^4", "Scores are integers."],
    starterCode: `/**
 * @param { { id: string, score: number }[] } products
 * @param { number } k
 * @returns { string[] }
 */
function solve(products, k) {
  // TODO
}
`,
    testCases: [
      {
        id: "order",
        input: [
          [
            { id: "a", score: 2 },
            { id: "b", score: 2 },
            { id: "c", score: 1 },
          ],
          2,
        ],
        expected: ["a", "b"],
      },
      {
        id: "top1",
        input: [[{ id: "x", score: 10 }, { id: "y", score: 5 }], 1],
        expected: ["x"],
      },
    ],
    idealApproach: "Sort a copy of the array with comparator (score desc, id asc) and take the first k ids.",
    complexity: "O(n log n) time for sorting, O(n) space for the copy.",
  },
  {
    id: "first-unique-character",
    title: "First Unique Character",
    difficulty: "Easy",
    pattern: "Frequency Map",
    prompt:
      "Given a string `s`, return the index of the first non-repeating character. If none exists, return `-1`.",
    examples: [
      { input: 's = "leetcode"', output: "0", explanation: '"l" is first char with count 1.' },
      { input: 's = "aabb"', output: "-1" },
    ],
    constraints: ["1 ≤ s.length ≤ 10^5", "`s` contains only lowercase English letters."],
    starterCode: `/**
 * @param { string } s
 * @returns { number }
 */
function solve(s) {
  // TODO
}
`,
    testCases: [
      { id: "leetcode", input: ["leetcode"], expected: 0 },
      { id: "love", input: ["loveleetcode"], expected: 2 },
      { id: "none", input: ["aabb"], expected: -1 },
    ],
    idealApproach: "Two passes: count with a Map/array of size 26, then scan indices in order.",
    complexity: "O(n) time, O(1) or O(alphabet) space.",
  },
  {
    id: "count-duplicate-emails",
    title: "Count Duplicate Emails",
    difficulty: "Easy",
    pattern: "Frequency Map",
    prompt:
      "Given an array of email strings, return how many **extra** occurrences exist beyond the first appearance of each email. Equivalently: `emails.length -` number of distinct emails.",
    examples: [
      { input: '["a@x.com","b@x.com","a@x.com"]', output: "1", explanation: "One duplicate of `a@x.com`." },
    ],
    constraints: ["0 ≤ emails.length ≤ 10^5", "Emails are non-empty strings."],
    starterCode: `/**
 * @param { string[] } emails
 * @returns { number }
 */
function solve(emails) {
  // TODO
}
`,
    testCases: [
      { id: "simple", input: [["a", "b", "a"]], expected: 1 },
      { id: "triple", input: [["x", "x", "x"]], expected: 2 },
      { id: "empty", input: [[]], expected: 0 },
    ],
    idealApproach: "Use a Set for distinct count, or a frequency map and sum counts minus one.",
    complexity: "O(n) time, O(n) space.",
  },
  {
    id: "group-products-by-category",
    title: "Group Products by Category",
    difficulty: "Easy",
    pattern: "Frequency Map",
    prompt:
      "Given products `{ id: string, category: string }[]`, return a plain object mapping each category to an array of product ids (in the order they appeared in the input).",
    examples: [
      {
        input: '[{id:"p1",category:"x"},{id:"p2",category:"y"},{id:"p3",category:"x"}]',
        output: '{ x: ["p1","p3"], y: ["p2"] }',
      },
    ],
    constraints: ["1 ≤ products.length ≤ 10^4"],
    starterCode: `/**
 * @param { { id: string, category: string }[] } products
 * @returns { Record<string, string[]> }
 */
function solve(products) {
  // TODO
}
`,
    testCases: [
      {
        id: "group",
        input: [
          [
            { id: "p1", category: "x" },
            { id: "p2", category: "y" },
            { id: "p3", category: "x" },
          ],
        ],
        expected: { x: ["p1", "p3"], y: ["p2"] },
      },
    ],
    idealApproach: "Iterate once, push ids into a Map<string, string[]> then convert to object.",
    complexity: "O(n) time, O(n) space.",
  },
  {
    id: "sort-users-by-score-and-name",
    title: "Sort Users by Score and Name",
    difficulty: "Medium",
    pattern: "Sorting + Tie-breaker",
    prompt:
      "Given users `{ name: string, score: number }[]`, return a **new** array sorted by `score` descending. When scores tie, sort by `name` ascending (lexicographic).",
    examples: [
      {
        input: '[{name:"ann",score:10},{name:"bob",score:10},{name:"cam",score:5}]',
        output: "ann, then bob (score tie-break by name), then cam",
      },
    ],
    constraints: ["1 ≤ users.length ≤ 10^4"],
    starterCode: `/**
 * @param { { name: string, score: number }[] } users
 * @returns { { name: string, score: number }[] }
 */
function solve(users) {
  // TODO
}
`,
    testCases: [
      {
        id: "tie",
        input: [
          [
            { name: "bob", score: 10 },
            { name: "ann", score: 10 },
            { name: "cam", score: 5 },
          ],
        ],
        expected: [
          { name: "ann", score: 10 },
          { name: "bob", score: 10 },
          { name: "cam", score: 5 },
        ],
      },
    ],
    idealApproach: "Copy the array and sort with comparator: if scores differ return b.score - a.score, else compare names.",
    complexity: "O(n log n) time.",
  },
  {
    id: "rank-products-by-views-and-id",
    title: "Rank Products by Views and ID",
    difficulty: "Medium",
    pattern: "Sorting + Tie-breaker",
    prompt:
      "Given `{ id: number, views: number }[]`, return a new array sorted by `views` descending. When views tie, sort by `id` ascending.",
    examples: [{ input: "[{id:2,views:5},{id:1,views:5}]", output: "id 1 before id 2" }],
    constraints: ["1 ≤ items.length ≤ 10^4", "Ids are unique positive integers."],
    starterCode: `/**
 * @param { { id: number, views: number }[] } items
 * @returns { { id: number, views: number }[] }
 */
function solve(items) {
  // TODO
}
`,
    testCases: [
      {
        id: "views-tie",
        input: [
          [
            { id: 2, views: 100 },
            { id: 1, views: 100 },
            { id: 3, views: 50 },
          ],
        ],
        expected: [
          { id: 1, views: 100 },
          { id: 2, views: 100 },
          { id: 3, views: 50 },
        ],
      },
    ],
    idealApproach: "Sort with comparator on (views desc, id asc).",
    complexity: "O(n log n) time.",
  },
  {
    id: "valid-palindrome",
    title: "Valid Palindrome",
    difficulty: "Easy",
    pattern: "Two Pointers",
    prompt:
      "Given a string `s`, return `true` if it reads the same forward and backward when considering only alphanumeric characters and ignoring case.",
    examples: [
      { input: '"A man, a plan, a canal: Panama"', output: "true" },
      { input: '"race a car"', output: "false" },
    ],
    constraints: ["1 ≤ s.length ≤ 2·10^5"],
    starterCode: `/**
 * @param { string } s
 * @returns { boolean }
 */
function solve(s) {
  // TODO
}
`,
    testCases: [
      { id: "classic", input: ["A man, a plan, a canal: Panama"], expected: true },
      { id: "not", input: ["race a car"], expected: false },
      { id: "spaces", input: [" "], expected: true },
    ],
    idealApproach: "Two pointers from ends, skip non-alphanumeric, compare lowercased letters.",
    complexity: "O(n) time, O(1) extra space.",
  },
  {
    id: "debounce",
    title: "Debounce",
    difficulty: "Medium",
    pattern: "Async JavaScript",
    prompt:
      "Implement `solve(fn, waitMs)` that returns a debounced function. Rapid calls should reset the timer; only after `waitMs` with no new calls should `fn` run with the **last** arguments.",
    examples: [
      {
        input: "Calls debounced(arg) multiple times within wait",
        output: "fn runs once with the last arg after quiet period",
      },
    ],
    constraints: ["Use timers available in the browser (setTimeout/clearTimeout).", "Do not use lodash."],
    starterCode: `/**
 * @param { (...args: any[]) => void } fn
 * @param { number } waitMs
 * @returns { (...args: any[]) => void }
 */
function solve(fn, waitMs) {
  // TODO
}
`,
    testCases: [],
    runCustomTests: async (solve): Promise<TestOutcome[]> => {
      try {
        const noop = () => {};
        const w = solve(noop, 5) as unknown;
        if (typeof w !== "function") {
          return [{ id: "debounce-type", pass: false, detail: "solve(fn, waitMs) must return a function." }];
        }
      } catch (e) {
        return [{ id: "debounce-type", pass: false, detail: e instanceof Error ? e.message : String(e) }];
      }

      const calls: string[] = [];
      const debounced = solve((s: string) => void calls.push(s), 80) as (s: string) => void;

      debounced("a");
      debounced("b");

      await new Promise((r) => setTimeout(r, 35));
      if (calls.length !== 0) {
        return [{ id: "debounce-wait", pass: false, detail: "Function ran before waitMs elapsed." }];
      }

      await new Promise((r) => setTimeout(r, 55));
      const snapshot = calls.slice();
      if (snapshot.length === 1 && snapshot[0] === "b") {
        return [
          { id: "debounce-wait", pass: true },
          { id: "debounce-last-args", pass: true },
        ];
      }
      return [
        {
          id: "debounce-last-args",
          pass: false,
          detail: `Expected a single call with "b", received: ${JSON.stringify(snapshot)}`,
        },
      ];
    },
    idealApproach:
      "Keep a timeout id in closure; on each call clear previous timeout and schedule a new one with latest args.",
    complexity: "O(1) per call amortized; one execution per quiet window.",
  },
  {
    id: "normalize-api-response",
    title: "Normalize API Response",
    difficulty: "Medium",
    pattern: "Frontend Logic",
    prompt:
      "Implement `solve(raw)` returning `{ ok: boolean, data?: unknown, error?: string }`.\n" +
      "- If `raw.success === true`, return `{ ok: true, data: raw.payload ?? raw.data }`.\n" +
      "- If `raw.ok === false`, return `{ ok: false, error: raw.message ?? raw.error ?? \"Unknown error\" }`.\n" +
      "- Otherwise return `{ ok: false, error: \"Invalid response\" }`.",
    examples: [
      { input: "{ success: true, payload: { x: 1 } }", output: "{ ok: true, data: { x: 1 } }" },
      { input: "{ ok: false, message: \"nope\" }", output: "{ ok: false, error: \"nope\" }" },
    ],
    constraints: ["Treat missing fields conservatively."],
    starterCode: `/**
 * @param { any } raw
 * @returns { { ok: boolean, data?: unknown, error?: string } }
 */
function solve(raw) {
  // TODO
}
`,
    testCases: [
      {
        id: "success-payload",
        input: [{ success: true, payload: { user: 1 } }],
        expected: { ok: true, data: { user: 1 } },
      },
      {
        id: "success-data",
        input: [{ success: true, data: [1, 2] }],
        expected: { ok: true, data: [1, 2] },
      },
      {
        id: "fail-message",
        input: [{ ok: false, message: "bad" }],
        expected: { ok: false, error: "bad" },
      },
      {
        id: "fail-error-field",
        input: [{ ok: false, error: "e" }],
        expected: { ok: false, error: "e" },
      },
      {
        id: "invalid",
        input: [{ foo: 1 }],
        expected: { ok: false, error: "Invalid response" },
      },
    ],
    idealApproach: "Branch on discriminant fields; normalize keys into a single result shape.",
    complexity: "O(1) time.",
  },
];

export function getProblemById(id: string): ProblemDefinition | undefined {
  return PROBLEMS.find((p) => p.id === id);
}

export function groupProblemsByPattern(): Record<ProblemPattern, ProblemDefinition[]> {
  return byPattern();
}
