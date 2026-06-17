import { CAREER_TOOL_REGISTRY } from "./registry.js";
import { CAREER_TOOL_NAMES } from "./types.js";
import { getCareerToolInputJsonSchema } from "./schemas.js";
import type { CareerMcpToolDescriptor } from "./types.js";

export function listCareerMcpToolDescriptors(): CareerMcpToolDescriptor[] {
  return CAREER_TOOL_NAMES.map((name) => {
    const definition = CAREER_TOOL_REGISTRY[name];
    return {
      name,
      description: definition.description,
      inputSchema: getCareerToolInputJsonSchema(name),
    };
  });
}
