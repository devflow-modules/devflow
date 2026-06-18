const FORBIDDEN_KEY_PATTERN =
  /access_token|refresh_token|client_secret|nango_secret_key|authorization|connectionid|connection_id|messageid|message_id|threadid|thread_id|eventid|event_id|^subject$|^snippet$|^body$|^description$|^location$|attendee|rawproviderpayload|raw_provider_payload|systemprompt|system_prompt|developerprompt|developer_prompt|hiddenprompt|hidden_prompt|promptoverride|prompt_override|custominstructions|custom_instructions|toolregistry|tool_registry|allowedcapabilities|allowed_capabilities|executionplan|execution_plan|functioncall|function_call|toolcall|tool_call|^command$|^url$|^headers$|filesystempath|filesystem_path|temperature|^model$|^prompt$/i;

const FORBIDDEN_VALUE_PATTERN =
  /Bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/i;

/**
 * Conservative prompt-injection patterns. Detection produces a stable warning but never
 * disables constraints or the structured-output requirement.
 */
const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior)\s+instructions/i,
  /reveal\s+(the\s+)?system\s+prompt/i,
  /show\s+(the\s+)?(hidden|system)\s+prompt/i,
  /bypass\s+(the\s+)?polic(y|ies)/i,
  /execute\s+(the\s+)?tool\s+directly/i,
  /run\s+(the\s+)?tool\s+(directly|now)/i,
];

export function containsForbiddenCareerLlmKey(key: string): boolean {
  return FORBIDDEN_KEY_PATTERN.test(key);
}

export function scanCareerLlmPayloadForForbiddenKeys(value: unknown, path = ""): string[] {
  if (value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      scanCareerLlmPayloadForForbiddenKeys(entry, `${path}[${index}]`),
    );
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const hits: string[] = [];

    for (const [key, nested] of Object.entries(record)) {
      const nextPath = path ? `${path}.${key}` : key;
      if (containsForbiddenCareerLlmKey(key)) {
        hits.push(nextPath);
      }
      hits.push(...scanCareerLlmPayloadForForbiddenKeys(nested, nextPath));
    }

    return hits;
  }

  if (typeof value === "string" && FORBIDDEN_VALUE_PATTERN.test(value)) {
    return [path || "value"];
  }

  return [];
}

export function detectCareerLlmPromptInjection(message: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(message));
}
