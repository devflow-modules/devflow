import { increment } from "@devflow/analytics-core";

const PREFIX = "investiga.";

export const EVENTS = {
  cnpjQueryRequested: PREFIX + "cnpj_query_requested",
  cnpjCacheHit: PREFIX + "cnpj_cache_hit",
  cnpjCacheMiss: PREFIX + "cnpj_cache_miss",
  cnpjQueryCompleted: PREFIX + "cnpj_query_completed",
  userLogin: PREFIX + "user_login",
  userLogout: PREFIX + "user_logout",
  historyViewed: PREFIX + "history_viewed",
  profileUpdated: PREFIX + "profile_updated",
  webhookReceived: PREFIX + "webhook_received",
  webhookUserCreated: PREFIX + "webhook_user_created",
} as const;

export function trackCnpjQueryRequested(): void {
  increment(EVENTS.cnpjQueryRequested);
}
export function trackCnpjCacheHit(): void {
  increment(EVENTS.cnpjCacheHit);
}
export function trackCnpjCacheMiss(): void {
  increment(EVENTS.cnpjCacheMiss);
}
export function trackCnpjQueryCompleted(): void {
  increment(EVENTS.cnpjQueryCompleted);
}
export function trackUserLogin(): void {
  increment(EVENTS.userLogin);
}
export function trackUserLogout(): void {
  increment(EVENTS.userLogout);
}
export function trackHistoryViewed(): void {
  increment(EVENTS.historyViewed);
}
export function trackProfileUpdated(): void {
  increment(EVENTS.profileUpdated);
}
export function trackWebhookReceived(): void {
  increment(EVENTS.webhookReceived);
}
export function trackWebhookUserCreated(): void {
  increment(EVENTS.webhookUserCreated);
}
