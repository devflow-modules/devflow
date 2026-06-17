import { describe, expect, it } from "vitest";
import {
  CAREER_TOOL_FORBIDDEN_NAMES,
  CAREER_TOOL_NAMES,
  CAREER_TOOL_REGISTRY,
  isCareerToolName,
  listCareerMcpToolDescriptors,
  resolveCareerToolDefinition,
} from "../index.js";

describe("career tool registry", () => {
  it("is immutable with unique names and valid capabilities", () => {
    expect(Object.isFrozen(CAREER_TOOL_REGISTRY)).toBe(true);
    expect(CAREER_TOOL_NAMES.length).toBe(new Set(CAREER_TOOL_NAMES).size);
    for (const name of CAREER_TOOL_NAMES) {
      const definition = resolveCareerToolDefinition(name)!;
      expect(definition.requiredCapability).toBeTruthy();
      expect(definition.executionMode).not.toBe("blocked");
    }
  });

  it("blocks unknown tools", () => {
    expect(isCareerToolName("career.unknown")).toBe(false);
    expect(resolveCareerToolDefinition("career.submit_application")).toBeNull();
  });

  it("does not list forbidden tools in MCP descriptors", () => {
    const descriptors = listCareerMcpToolDescriptors();
    expect(descriptors).toHaveLength(CAREER_TOOL_NAMES.length);
    for (const forbidden of CAREER_TOOL_FORBIDDEN_NAMES) {
      expect(descriptors.some((descriptor) => descriptor.name === forbidden)).toBe(false);
    }
  });
});
