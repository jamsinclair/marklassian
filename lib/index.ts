import { marked } from "marked";
import type { Token, Tokens } from "marked";

type AdfNode = {
  type: string;
  attrs?: Record<string, any>;
  content?: AdfNode[];
  marks?: AdfMark[];
  text?: string;
};

type AdfMark = {
  type: string;
  attrs?: Record<string, any>;
};

type AdfDocument = {
  version: 1;
  type: "doc";
  content: AdfNode[];
};

type RelaxedToken = Token & {
  tokens?: RelaxedToken[];
  task?: boolean;
  checked?: boolean;
};

export type LocalIdNodeType = "taskList" | "taskItem";

export type MarkdownToAdfOptions = {
  /**
   * Generates the `localId` attribute for ADF nodes that require one.
   * Returned IDs must be unique within the document. Defaults to a random UUID v4.
   */
  generateLocalId?: (nodeType: LocalIdNodeType) => string;
};

const defaultGenerateLocalId = (): string => globalThis.crypto.randomUUID();

let generateLocalId: (nodeType: LocalIdNodeType) => string =
  defaultGenerateLocalId;

/**
 * Parses an <adf>...</adf> HTML token value and returns the embedded ADF node(s).
 * Returns null if the raw string is not an <adf> tag.
 * Throws a descriptive error if the tag content is not valid ADF JSON.
 */
function parseAdfTag(raw: string): AdfNode | AdfNode[] | null {
  const match = raw.trim().match(/^<adf>([\s\S]*?)<\/adf>$/i);
  if (!match) return null;

  const json = match[1]!.trim();

  if (json.length === 0) {
    throw new Error(
      "<adf> tag content is empty — expected a JSON object or array",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(`Invalid JSON in <adf> tag: ${json}`);
  }

  if (Array.isArray(parsed)) {
    return parsed.map((item, i) => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        throw new Error(
          `ADF node must be a JSON object or array of objects (item ${i} is not an object)`,
        );
      }
      const node = item as Record<string, unknown>;
      if (typeof node.type !== "string" || node.type.length === 0) {
        throw new Error(`ADF node must have a "type" string property`);
      }
      return node as AdfNode;
    });
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(
      `ADF node must be a JSON object or array, got: ${JSON.stringify(parsed)}`,
    );
  }

  const node = parsed as Record<string, unknown>;
  if (typeof node.type !== "string" || node.type.length === 0) {
    throw new Error(`ADF node must have a "type" string property`);
  }

  return node as AdfNode;
}

export function markdownToAdf(
  markdown: string,
  options: MarkdownToAdfOptions = {},
): AdfDocument {
  generateLocalId = options.generateLocalId ?? defaultGenerateLocalId;
  try {
    const tokens = marked.lexer(markdown);
    return {
      version: 1,
      type: "doc",
      content: tokensToAdf(tokens),
    };
  } finally {
    generateLocalId = defaultGenerateLocalId;
  }
}

function tokensToAdf(tokens?: RelaxedToken[]): AdfNode[] {
  if (!tokens) return [];

  return tokens
    .map((token) => {
      switch (token.type) {
        case "paragraph":
          return processParagraph(token.tokens);

        case "heading":
          return {
            type: "heading",
            attrs: { level: token.depth },
            content: inlineToAdf(token.tokens),
          };

        case "list":
          return processList(token as Tokens.List);

        case "code":
          return {
            type: "codeBlock",
            attrs: { language: token.lang || "text" },
            content: [
              {
                type: "text",
                text: token.text,
              },
            ],
          };

        case "blockquote": {
          const content = flattenNestedBlocks(tokensToAdf(token.tokens));
          // ADF requires at least one item in the content
          if (!content.length) return null;
          return {
            type: "blockquote",
            content,
          };
        }

        case "hr":
          return { type: "rule" };

        case "table":
          return processTable(token as Tokens.Table);

        case "html": {
          const adfNode = parseAdfTag(token.raw);
          if (adfNode) return adfNode;
          return null;
        }

        default:
          return null;
      }
    })
    .filter(Boolean)
    .flat() as AdfNode[];
}

/**
 * ADF blockquotes and list items cannot contain headings or blockquotes.
 * Headings are converted to paragraphs and nested blockquotes are unwrapped.
 */
function flattenNestedBlocks(nodes: AdfNode[]): AdfNode[] {
  return nodes.flatMap((node) => {
    if (node.type === "heading") {
      return [{ type: "paragraph", content: node.content ?? [] }];
    }
    if (node.type === "blockquote") {
      return flattenNestedBlocks(node.content ?? []);
    }
    return [node];
  });
}

function createMediaNode(token: Tokens.Image): AdfNode {
  return {
    type: "mediaSingle",
    attrs: {
      layout: "center",
    },
    content: [
      {
        type: "media",
        attrs: {
          type: "external",
          url: token.href,
          alt: token.text || "",
        },
      },
    ],
  };
}

function processTable(token: Tokens.Table): AdfNode {
  const headers = token.header.map((header) => ({
    type: "tableHeader",
    content: processParagraph(header.tokens),
  }));

  const rows = token.rows.map((row) => ({
    type: "tableRow",
    content: row.map((cell) => {
      const content = processParagraph(cell.tokens);

      // ADF requires at least one item in the content
      if (content.length === 0) {
        content.push({
          type: "paragraph",
          content: [
            {
              type: "text",
              text: " ", // ADF requires at least 1 char
            },
          ],
        });
      }

      return {
        type: "tableCell",
        content,
      };
    }),
  }));

  const content = [];

  if (headers.length) {
    content.push({
      type: "tableRow",
      content: headers,
    });
  }

  return {
    type: "table",
    content: content.concat(rows),
  };
}

function processParagraph(tokens?: RelaxedToken[]): AdfNode[] {
  if (!tokens) return [];

  if (tokens.length === 1 && tokens[0]?.type === "image") {
    return [createMediaNode(tokens[0] as Tokens.Image)];
  }

  const outputNodes: AdfNode[] = [];
  let currentParagraphTokens: RelaxedToken[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] as RelaxedToken;

    if (token?.type === "image") {
      if (currentParagraphTokens.length) {
        const content = inlineToAdf(currentParagraphTokens);
        const lastNode = content.at(-1);
        if (lastNode?.type === "text" && lastNode.text?.endsWith(" ")) {
          lastNode.text = lastNode.text.slice(0, -1);
        }

        outputNodes.push({
          type: "paragraph",
          content,
        });
        currentParagraphTokens = [];
      }

      outputNodes.push(createMediaNode(token as Tokens.Image));
    } else {
      currentParagraphTokens.push(token);
    }
  }

  if (currentParagraphTokens.length) {
    outputNodes.push({
      type: "paragraph",
      content: inlineToAdf(currentParagraphTokens),
    });
  }

  return outputNodes;
}

const INLINE_TOKEN_TYPES = new Set([
  "text",
  "em",
  "strong",
  "del",
  "link",
  "codespan",
]);

function isInlineToken(token: RelaxedToken): boolean {
  return INLINE_TOKEN_TYPES.has(token.type);
}

function isTaskList(token: Tokens.List): boolean {
  return (
    token.items.length > 0 &&
    token.items.every((item: RelaxedToken) => item.task)
  );
}

function processList(token: Tokens.List): AdfNode[] {
  if (isTaskList(token)) {
    return processTaskList(token);
  }

  return [
    {
      type: token.ordered ? "orderedList" : "bulletList",
      ...(token.ordered ? { attrs: { order: token.start || 1 } } : {}),
      content: token.items.map((item: RelaxedToken) => processListItem(item)),
    },
  ];
}

function processListItem(item: RelaxedToken): AdfNode {
  const itemContent: AdfNode[] = [];
  let currentParagraphTokens: RelaxedToken[] = [];

  (item.tokens || []).forEach((token: RelaxedToken) => {
    if (isInlineToken(token)) {
      currentParagraphTokens.push(token);
    } else {
      if (currentParagraphTokens.length) {
        itemContent.push({
          type: "paragraph",
          content: inlineToAdf(currentParagraphTokens),
        });
        currentParagraphTokens = [];
      }

      if (token.type === "list") {
        itemContent.push(...processList(token as Tokens.List));
      } else {
        const processed = flattenNestedBlocks(tokensToAdf([token]));
        if (processed.length) {
          itemContent.push(...processed);
        }
      }
    }
  });

  if (currentParagraphTokens.length) {
    itemContent.push({
      type: "paragraph",
      content: inlineToAdf(currentParagraphTokens),
    });
  }

  // ADF requires at least one item in the content
  if (!itemContent.length) {
    itemContent.push({ type: "paragraph", content: [] });
  }

  return {
    type: "listItem",
    content: itemContent,
  };
}

type TaskListEntry =
  | { kind: "task"; depth: number; node: AdfNode }
  | { kind: "block"; node: AdfNode };

/**
 * ADF task items may only contain inline content. Nested task lists are
 * placed as siblings within the parent taskList, while any other nested
 * blocks (e.g. regular sub-lists) are placed after the task list.
 */
function processTaskList(token: Tokens.List): AdfNode[] {
  const entries: TaskListEntry[] = [];
  collectTaskListEntries(token, 0, entries);

  const output: AdfNode[] = [];
  let stack: { depth: number; list: AdfNode }[] = [];

  for (const entry of entries) {
    if (entry.kind === "block") {
      output.push(entry.node);
      stack = [];
      continue;
    }

    if (!stack.length) {
      const list = createTaskListNode();
      output.push(list);
      stack.push({ depth: entry.depth, list });
    }

    while (stack.length > 1 && entry.depth < stack.at(-1)!.depth) {
      stack.pop();
    }

    const current = stack.at(-1)!;
    if (entry.depth > current.depth && current.list.content!.length) {
      const nested = createTaskListNode();
      current.list.content!.push(nested);
      stack.push({ depth: entry.depth, list: nested });
    }

    stack.at(-1)!.list.content!.push(entry.node);
  }

  return output;
}

function createTaskListNode(): AdfNode {
  return {
    type: "taskList",
    attrs: { localId: generateLocalId("taskList") },
    content: [],
  };
}

function collectTaskListEntries(
  token: Tokens.List,
  depth: number,
  entries: TaskListEntry[],
): void {
  for (const item of token.items as RelaxedToken[]) {
    const inlineContent: AdfNode[] = [];
    const blockTokens: RelaxedToken[] = [];

    for (const child of item.tokens || []) {
      if (isInlineToken(child)) {
        inlineContent.push(...inlineToAdf([child]));
      } else if (child.type === "paragraph") {
        if (inlineContent.length) {
          inlineContent.push({ type: "hardBreak" });
        }
        inlineContent.push(...inlineToAdf(child.tokens));
      } else {
        blockTokens.push(child);
      }
    }

    entries.push({
      kind: "task",
      depth,
      node: {
        type: "taskItem",
        attrs: {
          localId: generateLocalId("taskItem"),
          state: item.checked ? "DONE" : "TODO",
        },
        content: inlineContent,
      },
    });

    for (const child of blockTokens) {
      if (child.type === "list" && isTaskList(child as Tokens.List)) {
        collectTaskListEntries(child as Tokens.List, depth + 1, entries);
      } else {
        for (const node of tokensToAdf([child])) {
          entries.push({ kind: "block", node });
        }
      }
    }
  }
}

function getSafeText(token: RelaxedToken): string {
  if (
    token.tokens?.length === 1 &&
    token.tokens[0] &&
    "text" in token.tokens[0]
  ) {
    return getSafeText(token.tokens[0]);
  }

  if ("text" in token) {
    return token.text.replace(/\n/g, " ").replace(/\s+/g, " ");
  }

  return "";
}

function getMarks(
  token: RelaxedToken,
  marks: Record<string, AdfMark> = {},
): AdfMark[] {
  if (token.type === "em" && !marks.em) {
    marks.em = { type: "em" };
  }

  if (token.type === "strong" && !marks.strong) {
    marks.strong = { type: "strong" };
  }

  if (token.type === "del" && !marks.strike) {
    marks.strike = { type: "strike" };
  }

  if (token.type === "link") {
    marks.link = {
      type: "link",
      attrs: { href: token.href },
    };
  }

  if (token.type === "codespan" && !marks.code) {
    marks.code = { type: "code" };
  }

  const nextToken = token.tokens?.[0];
  const tokensLength = token.tokens?.length ?? 0;

  // Only continue recursion if there is only one nested token
  if (nextToken && tokensLength === 1) {
    return getMarks(nextToken, marks);
  }

  const resolvedMarks = Object.values(marks);

  if (marks.code) {
    // Code Inline mark only supports a link or annotation mark
    return resolvedMarks.filter(
      (mark) => mark.type === "link" || mark.type === "code",
    );
  }

  return resolvedMarks;
}

function inlineToAdf(tokens?: RelaxedToken[]): AdfNode[] {
  if (!tokens) return [];

  return tokens
    .flatMap((token) => {
      switch (token.type) {
        case "text":
          if (token.tokens) {
            return inlineToAdf(token.tokens);
          }
          return [
            {
              type: "text",
              text: getSafeText(token),
              ...(token.tokens ? { content: inlineToAdf(token.tokens) } : {}),
            },
          ];

        case "em":
          return (token.tokens ?? []).map((t) => ({
            type: "text",
            text: getSafeText(t),
            marks: getMarks(t, { em: { type: "em" } }),
          }));

        case "strong":
          return (token.tokens ?? []).map((t) => ({
            type: "text",
            text: getSafeText(t),
            marks: getMarks(t, { strong: { type: "strong" } }),
          }));

        case "del":
          return (token.tokens ?? []).map((t) => ({
            type: "text",
            text: getSafeText(t),
            marks: getMarks(t, { strike: { type: "strike" } }),
          }));

        case "link":
          return [
            {
              type: "text",
              text: getSafeText(token),
              marks: getMarks(token),
            },
          ];

        case "codespan":
          return [
            {
              type: "text",
              text: getSafeText(token),
              marks: getMarks(token),
            },
          ];

        case "escape":
          return [
            {
              type: "text",
              text: token.text,
            },
          ];

        case "br":
          return [{ type: "hardBreak" }];

        default:
          return [];
      }
    })
    .filter((node) => {
      if (node.type === "text" && !node.text) {
        return false;
      }

      return true;
    });
}
