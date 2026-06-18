const FORBIDDEN_KEY_PATTERN =
  /access_token|refresh_token|client_secret|nango_secret_key|authorization|connectionid|connection_id|messageid|message_id|threadid|thread_id|eventid|event_id|^subject$|^snippet$|^body$|^description$|^location$|meetinglink|meeting_link|attendee/i;

const FORBIDDEN_VALUE_PATTERN =
  /Bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/i;

export function containsForbiddenCareerAgentKey(key: string): boolean {
  return FORBIDDEN_KEY_PATTERN.test(key);
}

export function scanCareerAgentPayloadForForbiddenKeys(value: unknown, path = ""): string[] {
  if (value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => scanCareerAgentPayloadForForbiddenKeys(entry, `${path}[${index}]`));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const hits: string[] = [];

    for (const [key, nested] of Object.entries(record)) {
      const nextPath = path ? `${path}.${key}` : key;
      if (containsForbiddenCareerAgentKey(key)) {
        hits.push(nextPath);
      }
      hits.push(...scanCareerAgentPayloadForForbiddenKeys(nested, nextPath));
    }

    return hits;
  }

  if (typeof value === "string" && FORBIDDEN_VALUE_PATTERN.test(value)) {
    return [path || "value"];
  }

  return [];
}

/**
 * Stricter forbidden-key set for specialist analysis inputs. The client may never
 * smuggle an agent/task/model/tool/capability/approval/execution selector or any
 * command/script/url/secret through analysisInput. Anchored to avoid matching
 * legitimate keys such as `requestedAgent`.
 */
const FORBIDDEN_ANALYSIS_INPUT_KEY_PATTERN =
  /^agent$|^task$|^tasks$|^model$|^models$|^provider$|systemprompt|system_prompt|developerprompt|developer_prompt|hiddenprompt|hidden_prompt|^tool$|^tools$|toolcall|tool_call|functioncall|function_call|^capability$|^capabilities$|executionplan|execution_plan|^approval$|^command$|^commands$|^script$|^shell$|filesystempath|filesystem_path|^path$|^url$|^urls$|^headers$|^authorization$|apikey|api_key|accesstoken|access_token|refreshtoken|refresh_token/i;

export function containsForbiddenCareerAnalysisInputKey(key: string): boolean {
  return FORBIDDEN_ANALYSIS_INPUT_KEY_PATTERN.test(key) || containsForbiddenCareerAgentKey(key);
}

export function scanCareerAnalysisInputForForbiddenKeys(value: unknown, path = ""): string[] {
  if (value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      scanCareerAnalysisInputForForbiddenKeys(entry, `${path}[${index}]`),
    );
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const hits: string[] = [];

    for (const [key, nested] of Object.entries(record)) {
      const nextPath = path ? `${path}.${key}` : key;
      if (containsForbiddenCareerAnalysisInputKey(key)) {
        hits.push(nextPath);
      }
      hits.push(...scanCareerAnalysisInputForForbiddenKeys(nested, nextPath));
    }

    return hits;
  }

  if (typeof value === "string" && FORBIDDEN_VALUE_PATTERN.test(value)) {
    return [path || "value"];
  }

  return [];
}

export function isCareerAgentContextSafe(value: unknown): boolean {
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

  return scanCareerAgentPayloadForForbiddenKeys(value).length === 0;
}
