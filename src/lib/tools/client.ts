import type { ToolConfig } from "./types";

/**
 * Client safe view of a tool.
 *
 * ToolConfig holds RegExp objects, which cannot cross the server to client
 * boundary. Patterns are sent as source strings and rebuilt in the browser so
 * the input can give instant feedback. The server validates again on every
 * request, so this is a convenience rather than a control.
 */
export interface ClientTool {
  id: string;
  name: string;
  slug: string;
  platform: string;
  enabled: boolean;
  placeholder: string;
  hostnames: string[];
  patternHint: string;
  patterns: Array<{ label: string; source: string; hosts?: string[] }>;
  preserveQueryKeys: string[];
}

export function toClientTool(tool: ToolConfig): ClientTool {
  return {
    id: tool.id,
    name: tool.name,
    slug: tool.slug,
    platform: tool.platform,
    enabled: tool.status === "live",
    placeholder: tool.validation.placeholder,
    hostnames: tool.validation.hostnames,
    patternHint: tool.validation.patternHint,
    patterns: tool.validation.patterns.map((pattern) => ({
      label: pattern.label,
      source: pattern.test.source,
      hosts: pattern.hosts,
    })),
    preserveQueryKeys: tool.validation.preserveQueryKeys ?? [],
  };
}

/** Same host and path check as the server, for immediate feedback while typing. */
export function quickValidate(input: string, tool: ClientTool): { ok: boolean; message?: string } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, message: "Paste a link to get started." };

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, message: "That does not look like a web link." };
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const hostOk = tool.hostnames.some((base) => host === base || host.endsWith(`.${base}`));
  if (!hostOk) {
    return { ok: false, message: `The ${tool.name} only accepts links from ${tool.hostnames.join(", ")}.` };
  }

  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : "/";
  const pathOk = tool.patterns.some((pattern) => {
    const hostOkForPattern =
      !pattern.hosts?.length ||
      pattern.hosts.some((base) => host === base || host.endsWith(`.${base}`));
    return hostOkForPattern && new RegExp(pattern.source).test(path);
  });
  if (!pathOk) return { ok: false, message: tool.patternHint };

  return { ok: true };
}
