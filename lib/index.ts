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

type RelaxedToken = Token & { tokens?: RelaxedToken[] };

export function markdownToAdf(markdown: string): AdfDocument {
  const tokens = marked.lexer(markdown);
  return {
    version: 1,
    type: "doc",
    content: tokensToAdf(tokens),
  };
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
          return {
            type: token.ordered ? "orderedList" : "bulletList",
            ...(token.ordered ? { attrs: { order: token.start || 1 } } : {}),
            content: token.items.map((item: RelaxedToken) =>
              processListItem(item),
            ),
          };

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

        case "blockquote":
          return {
            type: "blockquote",
            content: tokensToAdf(token.tokens),
          };

        case "hr":
          return { type: "rule" };

        case "table":
          return processTable(token as Tokens.Table);

        default:
          return null;
      }
    })
    .filter(Boolean)
    .flat() as AdfNode[];
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
        outputNodes.push({
          type: "paragraph",
          content: inlineToAdf(currentParagraphTokens),
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

function processListItem(item: RelaxedToken): AdfNode {
  const itemContent: AdfNode[] = [];
  let currentParagraphTokens: RelaxedToken[] = [];

  (item.tokens || []).forEach((token: RelaxedToken) => {
    if (
      token.type === "text" ||
      token.type === "em" ||
      token.type === "strong" ||
      token.type === "del" ||
      token.type === "link" ||
      token.type === "codespan"
    ) {
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
        itemContent.push({
          type: token.ordered ? "orderedList" : "bulletList",
          ...(token.ordered ? { attrs: { order: token.start || 1 } } : {}),
          content: token.items.map((nestedItem: RelaxedToken) =>
            processListItem(nestedItem),
          ),
        });
      } else {
        const processed = tokensToAdf([token]);
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

  return {
    type: "listItem",
    content: itemContent,
  };
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
    return token.text
      .replace(/\n$/, "")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ");
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
