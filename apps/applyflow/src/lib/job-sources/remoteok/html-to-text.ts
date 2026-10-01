import { parse, type HTMLElement, type Node as HtmlNode } from "node-html-parser";

const REMOVE_TAGS = new Set(["script", "style", "noscript", "iframe", "object", "embed", "svg"]);
const BLOCK_TAGS = new Set([
  "p",
  "div",
  "section",
  "article",
  "header",
  "footer",
  "aside",
  "blockquote",
  "pre",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "tr",
  "hr",
  "br",
]);

function stripEventAttributes(element: HTMLElement) {
  for (const attr of Object.keys(element.attributes)) {
    if (attr.toLowerCase().startsWith("on")) {
      element.removeAttribute(attr);
    }
  }
  for (const child of element.childNodes) {
    if (child.nodeType === 1) stripEventAttributes(child as HTMLElement);
  }
}

function removeDangerousNodes(root: HTMLElement) {
  for (const tag of REMOVE_TAGS) {
    for (const node of root.querySelectorAll(tag)) {
      node.remove();
    }
  }
}

function walkPlainText(node: HtmlNode, parts: string[]) {
  if (node.nodeType === 3) {
    parts.push(node.text);
    return;
  }
  if (node.nodeType !== 1) return;
  const element = node as HTMLElement;
  const tag = element.tagName?.toLowerCase() ?? "";
  if (REMOVE_TAGS.has(tag)) return;

  if (tag === "br" || tag === "hr") {
    parts.push("\n");
    return;
  }

  const isBlock = BLOCK_TAGS.has(tag);
  if (isBlock && parts.length > 0 && !parts[parts.length - 1]?.endsWith("\n")) {
    parts.push("\n");
  }

  for (const child of element.childNodes) {
    walkPlainText(child, parts);
  }

  if (isBlock && tag !== "br" && tag !== "hr") {
    if (!parts[parts.length - 1]?.endsWith("\n")) parts.push("\n");
  }
}

/**
 * Converts Remote OK HTML descriptions into plain text without rendering HTML.
 * Uses a real HTML parser (not regex-only). Scripts/styles/event handlers are dropped.
 */
export function remoteOkHtmlToPlainText(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";

  const root = parse(trimmed, {
    blockTextElements: {
      script: true,
      style: true,
      noscript: true,
    },
  });

  removeDangerousNodes(root);
  stripEventAttributes(root);

  const parts: string[] = [];
  walkPlainText(root, parts);

  return parts
    .join("")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
