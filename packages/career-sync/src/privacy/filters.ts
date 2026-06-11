/** Career-related keywords for calendar/gmail relevance checks. */
export const CAREER_KEYWORDS =
  /\b(interview|entrevista|technical|t[eé]cnico|recruiter|screening|triagem|offer|proposta|rejected|assignment|desafio|hiring|vaga|recrutamento)\b/i;

export const ACTION_REQUIRED_KEYWORDS =
  /\b(confirmar|responder|agendar|complete|assignment|desafio|confirm|reply|schedule|rsvp)\b/i;

export const MEETING_LINK_PATTERN =
  /\b(https?:\/\/)?(www\.)?(zoom\.us|meet\.google\.com|teams\.microsoft\.com|webex\.com)[^\s]*/gi;

export const URL_PATTERN = /\bhttps?:\/\/[^\s]+/gi;

export const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

export const PHONE_PATTERN = /\b(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}\b/g;

export function shouldRetainRawProviderData(): false {
  return false;
}

export function containsCareerKeyword(text: string): boolean {
  return CAREER_KEYWORDS.test(text);
}

export function requiresAction(text: string): boolean {
  return ACTION_REQUIRED_KEYWORDS.test(text);
}
