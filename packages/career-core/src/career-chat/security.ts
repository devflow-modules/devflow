import {
  containsForbiddenCareerAgentKey,
  scanCareerAgentPayloadForForbiddenKeys,
} from "../career-agents/security.js";

const CHAT_FORBIDDEN_KEY_PATTERN =
  /systemprompt|developerprompt|hiddenprompt|toolregistry|allowedcapabilities|blockedcapabilities|executionplan|approvalscope|attendeeemail|rawproviderpayload|filesystempath|^url$|^headers$|^command$/i;

export function containsForbiddenCareerChatKey(key: string): boolean {
  return CHAT_FORBIDDEN_KEY_PATTERN.test(key);
}

function isAllowedCareerChatDescriptionPath(path: string): boolean {
  return /^toolProposals\[\d+\]\.description$/.test(path);
}

function isAgentResultPath(path: string): boolean {
  return path === "agentResult" || path.startsWith("agentResult.");
}

export function scanCareerChatPayloadForForbiddenKeys(value: unknown, path = ""): string[] {
  if (value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      scanCareerChatPayloadForForbiddenKeys(entry, `${path}[${index}]`),
    );
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const hits: string[] = [];

    for (const [key, nested] of Object.entries(record)) {
      const nextPath = path ? `${path}.${key}` : key;

      if (isAgentResultPath(nextPath)) {
        hits.push(...scanCareerAgentPayloadForForbiddenKeys(nested, nextPath));
        continue;
      }

      const agentKeyForbidden = containsForbiddenCareerAgentKey(key);
      const chatKeyForbidden = containsForbiddenCareerChatKey(key);

      if (
        chatKeyForbidden ||
        (agentKeyForbidden && !(key === "description" && isAllowedCareerChatDescriptionPath(nextPath)))
      ) {
        hits.push(nextPath);
      }

      hits.push(...scanCareerChatPayloadForForbiddenKeys(nested, nextPath));
    }

    return hits;
  }

  return scanCareerAgentPayloadForForbiddenKeys(value, path);
}
