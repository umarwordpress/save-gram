import type { ToolConfig } from "@/lib/tools/types";
import { getListedTools, getToolBySlug, isToolEnabled } from "@/lib/tools/registry";
import { hostMatches, normalizeUrl, type NormalizedUrl } from "./normalize";

export type ValidationErrorCode =
  | "empty"
  | "malformed"
  | "unsupported_host"
  | "unsupported_path"
  | "wrong_tool"
  | "tool_unavailable";

export interface ValidationSuccess {
  ok: true;
  /** Cleaned URL to hand to the provider. */
  url: string;
  normalized: NormalizedUrl;
  /** Which supported pattern matched. */
  matchedPattern: string;
}

export interface ValidationFailure {
  ok: false;
  code: ValidationErrorCode;
  message: string;
  /** Set when the link belongs to a different SaveGram tool. */
  suggestedToolSlug?: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/** Step 1 of the pipeline: is this a URL at all, and does it match the tool. */
export function validateForTool(input: string, tool: ToolConfig): ValidationResult {
  if (!input || !input.trim()) {
    return { ok: false, code: "empty", message: "Paste a link to get started." };
  }

  const normalized = normalizeUrl(input, tool.validation.preserveQueryKeys);
  if (!normalized) {
    return {
      ok: false,
      code: "malformed",
      message: "That does not look like a web link. Copy the address again and paste the whole thing.",
    };
  }

  const hostOk = tool.validation.hostnames.some((base) => hostMatches(normalized.host, base));
  if (!hostOk) {
    const other = detectTool(normalized);
    if (other && other.slug !== tool.slug) {
      return {
        ok: false,
        code: "wrong_tool",
        message: `That link is from ${other.platformName}. Use the ${other.name} instead.`,
        suggestedToolSlug: other.slug,
      };
    }
    return {
      ok: false,
      code: "unsupported_host",
      message: `The ${tool.name} only accepts links from ${formatList(tool.validation.hostnames)}.`,
    };
  }

  const matched = tool.validation.patterns.find((pattern) => pattern.test.test(normalized.path));
  if (!matched) {
    return { ok: false, code: "unsupported_path", message: tool.validation.patternHint };
  }

  if (!isToolEnabled(tool)) {
    return {
      ok: false,
      code: "tool_unavailable",
      message: `The ${tool.name} is not available yet.`,
    };
  }

  return { ok: true, url: normalized.href, normalized, matchedPattern: matched.label };
}

/** Step 2 of the pipeline: which tool owns this link, by host then by path. */
export function detectTool(input: string | NormalizedUrl): ToolConfig | undefined {
  const normalized = typeof input === "string" ? normalizeUrl(input) : input;
  if (!normalized) return undefined;

  const candidates = getListedTools().filter((tool) =>
    tool.validation.hostnames.some((base) => hostMatches(normalized.host, base)),
  );
  if (candidates.length <= 1) return candidates[0];

  // More than one tool claims the host, so let the path decide.
  return (
    candidates.find((tool) =>
      tool.validation.patterns.some((pattern) => pattern.test.test(normalized.path)),
    ) ?? candidates[0]
  );
}

/**
 * Validate a link when the tool is not known up front, for example a paste into
 * a generic field. Falls back to platform detection.
 */
export function validateAny(input: string, preferredSlug?: string): ValidationResult & { tool?: ToolConfig } {
  const preferred = preferredSlug ? getToolBySlug(preferredSlug) : undefined;
  if (preferred) {
    const result = validateForTool(input, preferred);
    return result.ok ? { ...result, tool: preferred } : result;
  }

  const detected = detectTool(input);
  if (!detected) {
    return {
      ok: false,
      code: "unsupported_host",
      message: "No SaveGram tool handles that link yet. Check the tools directory for what is supported.",
    };
  }

  const result = validateForTool(input, detected);
  return result.ok ? { ...result, tool: detected } : result;
}

function formatList(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
