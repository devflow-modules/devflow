/** Default live-coding problem when deep-linking from Career Suite handoffs. */
export const DEFAULT_PRACTICE_PROBLEM_ID = "most-frequent-category";

export function practicePathWithCareerPrep(careerPrepRecordId: string): string {
  return `/practice/${DEFAULT_PRACTICE_PROBLEM_ID}?careerPrep=${encodeURIComponent(careerPrepRecordId)}`;
}
