import anyTest, { type TestFn } from "ava";
import { marked } from "marked";
import { markdownToAdf } from "../index";
import adfPassthroughAdf from "./fixtures/adf-passthrough.json" with {
  type: "json",
};

// Cast avoids TypeScript errors under this project's tsconfig — see core-markdown.test.ts for pattern
const test = anyTest as unknown as TestFn<void>;

// --- happy path: single object ---

test("passes through a block ADF node (object) embedded in markdown", (t) => {
  const markdown = `# My page

<adf>
{"type":"extension","attrs":{"extensionType":"com.atlassian.confluence.macro.core","extensionKey":"status","parameters":{"macroParams":{"title":{"value":"Done"},"colour":{"value":"Green"}}}}}
</adf>

More content after the macro.`;

  t.deepEqual(markdownToAdf(markdown), adfPassthroughAdf);
});

test("passes through a minimal ADF node with only a type", (t) => {
  t.deepEqual(markdownToAdf('<adf>\n{"type":"rule"}\n</adf>'), {
    version: 1,
    type: "doc",
    content: [{ type: "rule" }],
  });
});

test("passes through an ADF node with content and marks", (t) => {
  const node = {
    type: "panel",
    attrs: { panelType: "info" },
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Note this." }] },
    ],
  };
  t.deepEqual(markdownToAdf(`<adf>\n${JSON.stringify(node)}\n</adf>`), {
    version: 1,
    type: "doc",
    content: [node],
  });
});

// --- happy path: array ---

test("passes through multiple ADF nodes provided as a JSON array", (t) => {
  const nodes = [
    { type: "rule" },
    {
      type: "panel",
      attrs: { panelType: "info" },
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Note." }] },
      ],
    },
  ];
  t.deepEqual(markdownToAdf(`<adf>\n${JSON.stringify(nodes)}\n</adf>`), {
    version: 1,
    type: "doc",
    content: nodes,
  });
});

test("interleaves array-form ADF nodes with surrounding markdown", (t) => {
  const nodes = [{ type: "rule" }, { type: "rule" }];
  const markdown = `A paragraph.\n\n<adf>\n${JSON.stringify(nodes)}\n</adf>\n\nAnother paragraph.`;
  const result = markdownToAdf(markdown);
  t.is(result.content.length, 4);
  t.is(result.content[0]!.type, "paragraph");
  t.is(result.content[1]!.type, "rule");
  t.is(result.content[2]!.type, "rule");
  t.is(result.content[3]!.type, "paragraph");
});

// --- error cases ---

test("throws on malformed JSON inside <adf> tags", (t) => {
  t.throws(() => markdownToAdf("<adf>\nnot valid json\n</adf>"), {
    message: /Invalid JSON in <adf> tag/,
  });
});

test("throws when <adf> content is a valid object but missing type", (t) => {
  t.throws(() => markdownToAdf('<adf>\n{"attrs":{"level":1}}\n</adf>'), {
    message: /ADF node must have a "type" string/,
  });
});

test("throws when <adf> content is valid JSON but not an object or array", (t) => {
  t.throws(() => markdownToAdf("<adf>\n42\n</adf>"), {
    message: /ADF node must be a JSON object or array/,
  });
});

test("throws when <adf> array contains an item missing a type", (t) => {
  t.throws(
    () => markdownToAdf('<adf>\n[{"type":"rule"},{"attrs":{}}]\n</adf>'),
    { message: /ADF node must have a "type" string/ },
  );
});

// --- case-insensitivity ---

test("passes through a block ADF node with uppercase <ADF> tags", (t) => {
  t.deepEqual(markdownToAdf('<ADF>\n{"type":"rule"}\n</ADF>'), {
    version: 1,
    type: "doc",
    content: [{ type: "rule" }],
  });
});

// --- non-regression ---

test("ignores unrelated HTML tags (existing behaviour unchanged)", (t) => {
  t.deepEqual(markdownToAdf("<div>hello</div>\n\nA paragraph."), {
    version: 1,
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "A paragraph." }],
      },
    ],
  });
});

test("throws when <adf> tag is empty", (t) => {
  t.throws(() => markdownToAdf("<adf>\n</adf>"), {
    message: /\<adf\> tag content is empty/,
  });
});

// --- inline happy path ---

test("passes through an inline ADF node with uppercase <ADF> tags", (t) => {
  const result = markdownToAdf('text <ADF>{"type":"rule"}</ADF> more.');
  t.deepEqual(result, {
    version: 1,
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "text " },
          { type: "rule" },
          { type: "text", text: " more." },
        ],
      },
    ],
  });
});

test("passes through an inline ADF node (object) embedded in a paragraph", (t) => {
  const mention = {
    type: "mention",
    attrs: { id: "abc-123", text: "@Alice", accessLevel: "" },
  };
  const result = markdownToAdf(
    `Hello <adf>${JSON.stringify(mention)}</adf> how are you?`,
  );
  t.deepEqual(result, {
    version: 1,
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Hello " },
          mention,
          { type: "text", text: " how are you?" },
        ],
      },
    ],
  });
});

test("passes through multiple inline ADF nodes (array) embedded in a paragraph", (t) => {
  const emoji = { type: "emoji", attrs: { shortName: ":tada:", text: "🎉" } };
  const date = { type: "date", attrs: { timestamp: "1704067200000" } };
  const result = markdownToAdf(
    `Party <adf>${JSON.stringify([emoji, date])}</adf> launched.`,
  );
  t.deepEqual(result, {
    version: 1,
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Party " },
          emoji,
          date,
          { type: "text", text: " launched." },
        ],
      },
    ],
  });
});

test("passes through multiple inline <adf> tags within the same paragraph", (t) => {
  const mention = {
    type: "mention",
    attrs: { id: "abc-123", text: "@Alice", accessLevel: "" },
  };
  const emoji = { type: "emoji", attrs: { shortName: ":wave:", text: "👋" } };
  const result = markdownToAdf(
    `Hi <adf>${JSON.stringify(mention)}</adf> and <adf>${JSON.stringify(emoji)}</adf> there.`,
  );
  t.deepEqual(result, {
    version: 1,
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Hi " },
          mention,
          { type: "text", text: " and " },
          emoji,
          { type: "text", text: " there." },
        ],
      },
    ],
  });
});

test("passes through an inline ADF node inside a table cell", (t) => {
  const status = {
    type: "status",
    attrs: { text: "Done", color: "green", localId: "s1", style: "" },
  };
  const md = `| Status | Notes |\n| --- | --- |\n| <adf>${JSON.stringify(status)}</adf> | All good |`;
  const result = markdownToAdf(md);
  t.is(result.content.length, 1);
  t.is(result.content[0]!.type, "table");
  const tableRow = (result.content[0] as any).content[1]; // first data row (index 0 = header row)
  const firstCell = tableRow.content[0];
  t.is(firstCell.type, "tableCell");
  const cellParagraph = firstCell.content[0];
  t.is(cellParagraph.type, "paragraph");
  t.deepEqual(cellParagraph.content, [status]);
});

// --- inline error cases ---

test("throws on malformed JSON inside inline <adf> tags", (t) => {
  t.throws(() => markdownToAdf("text <adf>not valid json</adf> more."), {
    message: /Invalid JSON in <adf> tag/,
  });
});

test("throws when inline <adf> content is a valid object but missing type", (t) => {
  t.throws(() => markdownToAdf('text <adf>{"attrs":{"level":1}}</adf> more.'), {
    message: /ADF node must have a "type" string/,
  });
});

test("throws when inline <adf> tag is empty", (t) => {
  t.throws(() => markdownToAdf("text <adf></adf> more."), {
    message: /<adf> tag content is empty/,
  });
});

test("throws when inline <adf> array contains an item missing a type", (t) => {
  t.throws(
    () => markdownToAdf('text <adf>[{"type":"rule"},{"attrs":{}}]</adf> more.'),
    { message: /ADF node must have a "type" string/ },
  );
});

test("throws when inline <adf> content is valid JSON but not an object or array", (t) => {
  t.throws(() => markdownToAdf("text <adf>42</adf> more."), {
    message: /ADF node must be a JSON object or array/,
  });
});

// --- inline ADF inside emphasis/strong/del ---

test("passes through an inline ADF node inside bold text", (t) => {
  const mention = {
    type: "mention",
    attrs: { id: "abc-123", text: "@Alice", accessLevel: "APPLICATION" },
  };
  const result = markdownToAdf(
    `**Contact <adf>${JSON.stringify(mention)}</adf> for help.**`,
  );
  t.deepEqual(result, {
    version: 1,
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Contact ", marks: [{ type: "strong" }] },
          mention,
          { type: "text", text: " for help.", marks: [{ type: "strong" }] },
        ],
      },
    ],
  });
});

test("passes through an inline ADF node inside italic text", (t) => {
  const date = { type: "date", attrs: { timestamp: "1777852800000" } };
  const result = markdownToAdf(
    `*Returning <adf>${JSON.stringify(date)}</adf>*`,
  );
  t.deepEqual(result, {
    version: 1,
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Returning ", marks: [{ type: "em" }] },
          date,
        ],
      },
    ],
  });
});

test("passes through multiple inline ADF nodes inside bold text", (t) => {
  const mention1 = {
    type: "mention",
    attrs: { id: "id-1", text: "@Jamie", accessLevel: "APPLICATION" },
  };
  const date = { type: "date", attrs: { timestamp: "1777852800000" } };
  const mention2 = {
    type: "mention",
    attrs: { id: "id-2", text: "@Phoenix", accessLevel: "APPLICATION" },
  };
  const result = markdownToAdf(
    `**While <adf>${JSON.stringify(mention1)}</adf> is on leave (returning <adf>${JSON.stringify(date)}</adf>):** contact <adf>${JSON.stringify(mention2)}</adf>.`,
  );
  t.deepEqual(result, {
    version: 1,
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "While ", marks: [{ type: "strong" }] },
          mention1,
          {
            type: "text",
            text: " is on leave (returning ",
            marks: [{ type: "strong" }],
          },
          date,
          { type: "text", text: "):", marks: [{ type: "strong" }] },
          { type: "text", text: " contact " },
          mention2,
          { type: "text", text: "." },
        ],
      },
    ],
  });
});

// --- nested emphasis with inline ADF ---

test("bold span containing both italic text and an inline ADF node", (t) => {
  const mention = {
    type: "mention",
    attrs: { id: "abc-123", text: "@Alice", accessLevel: "APPLICATION" },
  };
  t.deepEqual(
    markdownToAdf(
      `**contact _Alice_ aka <adf>${JSON.stringify(mention)}</adf>**`,
    ),
    {
      version: 1,
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "contact ", marks: [{ type: "strong" }] },
            {
              type: "text",
              text: "Alice",
              marks: [{ type: "strong" }, { type: "em" }],
            },
            { type: "text", text: " aka ", marks: [{ type: "strong" }] },
            mention,
          ],
        },
      ],
    },
  );
});

test("inline ADF node inside italic text that is itself inside bold text", (t) => {
  const date = { type: "date", attrs: { timestamp: "1777852800000" } };
  t.deepEqual(
    markdownToAdf(`**returning _<adf>${JSON.stringify(date)}</adf>_**`),
    {
      version: 1,
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "returning ", marks: [{ type: "strong" }] },
            date,
          ],
        },
      ],
    },
  );
});

// --- block vs inline distinction ---

test("block <adf> tag produces a top-level doc child; bare inline <adf> tag gets a paragraph parent from marked", (t) => {
  // Block form: <adf> on its own line(s) with surrounding blank lines.
  // The node is emitted directly as a child of the document root.
  const blockResult = markdownToAdf('<adf>\n{"type":"rule"}\n</adf>');
  t.deepEqual(blockResult, {
    version: 1,
    type: "doc",
    content: [{ type: "rule" }],
  });

  // Inline form: <adf> alone on a line, no heading markers or other block syntax.
  // marked treats bare inline content as a paragraph, so the node ends up inside one.
  // The paragraph wrapper comes from marked's parsing context, not from the <adf> handler itself.
  const inlineResult = markdownToAdf('<adf>{"type":"rule"}</adf>');
  t.deepEqual(inlineResult, {
    version: 1,
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "rule" }],
      },
    ],
  });

  // To confirm: inside a heading, marked provides a heading context instead,
  // so the ADF node sits directly inside the heading with no paragraph wrapper.
  const headingResult = markdownToAdf('# Title <adf>{"type":"rule"}</adf>');
  t.deepEqual(headingResult, {
    version: 1,
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Title " }, { type: "rule" }],
      },
    ],
  });
});

// --- marked singleton isolation ---

test("importing marklassian does not affect marked.parse() HTML output", (t) => {
  // The adf_inline extension must be registered on a local Marked instance,
  // not the global singleton — so consumers using marked directly are unaffected.
  // A clean singleton renders <adf> as literal HTML; a mutated one swallows it (returns "<p></p>\n").
  const html = marked.parse('<adf>{"type":"rule"}</adf>') as string;
  t.is(html, "<p><adf>{&quot;type&quot;:&quot;rule&quot;}</adf></p>\n");
});
