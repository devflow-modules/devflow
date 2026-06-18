import { scanCareerAutomationPayloadForForbiddenKeys } from "@devflow/career-core";

/**
 * OpenClaw-specific forbidden keys, layered on top of the shared career-automation
 * scanner. These reject any attempt to smuggle execution control, additional steps,
 * scheduling, networking, filesystem, shell, memory/session, or secrets through the
 * outbound envelope or the inbound transport response.
 */
const FORBIDDEN_OPENCLAW_KEY_PATTERN =
  /^command$|^commands$|^shell$|^script$|^path$|^url$|^headers$|callbackurl|callback_url|webhookurl|webhook_url|^callback$|^webhook$|^schedule$|^cron$|^background$|backgroundexecution|background_execution|retrypolicy|retry_policy|nextaction|next_action|toolcalls|tool_calls|functioncall|function_call|^memory$|^session$|sessionid|session_id|^authorization$|apikey|api_key|accesstoken|access_token|refreshtoken|refresh_token|filesystem/i;

export function containsForbiddenOpenClawKey(key: string): boolean {
  return FORBIDDEN_OPENCLAW_KEY_PATTERN.test(key);
}

export function scanOpenClawPayloadForForbiddenKeys(value: unknown, path = ""): string[] {
  const sharedHits = scanCareerAutomationPayloadForForbiddenKeys(value);
  const ownHits = scanOwnForbiddenKeys(value, path);
  return [...sharedHits, ...ownHits];
}

function scanOwnForbiddenKeys(value: unknown, path: string): string[] {
  if (value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => scanOwnForbiddenKeys(entry, `${path}[${index}]`));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const hits: string[] = [];

    for (const [key, nested] of Object.entries(record)) {
      const nextPath = path ? `${path}.${key}` : key;
      if (containsForbiddenOpenClawKey(key)) {
        hits.push(nextPath);
      }
      hits.push(...scanOwnForbiddenKeys(nested, nextPath));
    }

    return hits;
  }

  return [];
}
