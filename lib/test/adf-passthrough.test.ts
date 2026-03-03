import test from "ava";
import { markdownToAdf } from "../index";
import adfPassthroughAdf from "./fixtures/adf-passthrough.json" with {
  type: "json",
};

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
  t.is(result.content[0].type, "paragraph");
  t.is(result.content[1].type, "rule");
  t.is(result.content[2].type, "rule");
  t.is(result.content[3].type, "paragraph");
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
