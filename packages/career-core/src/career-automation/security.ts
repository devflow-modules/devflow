import {
  containsForbiddenCareerAgentKey,
  scanCareerAgentPayloadForForbiddenKeys,
} from "../career-agents/security.js";

/**
 * Automation-specific forbidden keys layered on top of the shared career-agent
 * scanner. These reject any attempt to smuggle execution control, secrets, raw
 * provider payloads, scheduling, networking, or filesystem directives through the
 * client request body.
 */
const FORBIDDEN_AUTOMATION_KEY_PATTERN =
  /^command$|^url$|^headers$|filesystempath|filesystem_path|^cron$|^schedule$|retrypolicy|retry_policy|^background$|backgroundmode|background_mode|callbackurl|callback_url|webhookurl|webhook_url|rawproviderpayload|raw_provider_payload|systemprompt|system_prompt|developerprompt|developer_prompt|hiddenprompt|hidden_prompt|toolregistry|tool_registry|allowedcapabilities|allowed_capabilities|executionplan|execution_plan/i;

export function containsForbiddenCareerAutomationKey(key: string): boolean {
  return FORBIDDEN_AUTOMATION_KEY_PATTERN.test(key) || containsForbiddenCareerAgentKey(key);
}

export function scanCareerAutomationPayloadForForbiddenKeys(value: unknown, path = ""): string[] {
  const agentHits = scanCareerAgentPayloadForForbiddenKeys(value, path);
  const automationHits = scanForbiddenAutomationKeys(value, path);
  return [...agentHits, ...automationHits];
}

function scanForbiddenAutomationKeys(value: unknown, path: string): string[] {
  if (value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => scanForbiddenAutomationKeys(entry, `${path}[${index}]`));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const hits: string[] = [];

    for (const [key, nested] of Object.entries(record)) {
      const nextPath = path ? `${path}.${key}` : key;
      if (containsForbiddenCareerAutomationKey(key)) {
        hits.push(nextPath);
      }
      hits.push(...scanForbiddenAutomationKeys(nested, nextPath));
    }

    return hits;
  }

  return [];
}

export function isCareerAutomationContextSafe(value: unknown): boolean {
  if (value == null || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (record.hasToken === true) {
    return false;
  }

  if (record.rawProviderData === true) {
    return false;
  }

  return scanCareerAutomationPayloadForForbiddenKeys(value).length === 0;
}
