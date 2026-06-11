export type NangoProvider = "gmail" | "google-calendar";

export type NangoGmailMessageLike = {
  id: string;
  threadId?: string;
  from?: string;
  subject?: string;
  snippet?: string;
  date?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  };
};

export type NangoCalendarEventLike = {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  htmlLink?: string;
  hangoutLink?: string;
};
