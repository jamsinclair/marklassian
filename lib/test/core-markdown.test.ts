import anyTest, { type TestFn } from "ava";
import { markdownToAdf } from "../index";
import basicsAdf from "./fixtures/basics.json" with { type: "json" };
import codeBlocksAdf from "./fixtures/code-blocks.json" with { type: "json" };
import inlineCodeAdf from "./fixtures/inline-code-marks.json" with {
  type: "json",
};
import nestedListAdf from "./fixtures/nested-list.json" with { type: "json" };
import specialCharsAdf from "./fixtures/special-chars.json" with {
  type: "json",
};
import tableAdf from "./fixtures/table.json" with { type: "json" };
import textEdgeCases from "./fixtures/text-edge-cases.json" with {
  type: "json",
};
import taskListAdf from "./fixtures/gfm-task-list.json" with { type: "json" };
import nestedTaskListAdf from "./fixtures/gfm-nested-task-list.json" with {
  type: "json",
};

const test = anyTest as unknown as TestFn<void>;

test("Can convert basic markdown elements", async (t) => {
  const markdown = `# Hello World

This is a **bold** and *italic* text.

This is a [link](https://example.org).

This is \`inline code\`

This is ~~striked~~ text

Below is an image
![Example Image](https://picsum.photos/400/300)

## Lists
- Item 1
- Item 2
  - Nested item

1. Ordered item 1
2. Ordered item 2

> This is a blockquote`;
  const adf = await markdownToAdf(markdown);
  t.deepEqual(adf, basicsAdf);
});

test(`Can convert nested lists`, async (t) => {
  const markdown = `- Item 1
  - Nested item
    - Nested Nested item
      1. Ordered List item nested in unordered list
- **Strong** Item 2

1. Ordered item 1
    1. Nested ordered list item
          1. Nested ordered list item
                - Unordered list item nested in ordered list
2. **Strong** Ordered item 2`;

  const adf = await markdownToAdf(markdown);
  t.deepEqual(adf, nestedListAdf);
});

test(`For inline code marks only allow link marks and not other inline marks`, async (t) => {
  const markdown = `[\`Inline Code\`](https://github.com)

[**\`Inline Code\`**](https://github.com)`;

  const adf = await markdownToAdf(markdown);
  t.deepEqual(adf, inlineCodeAdf);
});

test(`Converts code blocks correctly`, async (t) => {
  const markdown = `\`\`\`typescript
const hello = "world";
console.log(hello);
\`\`\`

\`\`\`bash
echo "Hello World"
\`\`\`

\`\`\`
Some text
\`\`\``;

  const adf = await markdownToAdf(markdown);
  t.deepEqual(adf, codeBlocksAdf);
});

test(`Text edge cases are handled correctly`, async (t) => {
  const markdown = `Text will still be in same text block
when only one line break.

Multiple spaces   will be converted     to one     space.

This line will have a  
hard break.

Thisstringoftexthasa**strong**wordcontained.`;

  const adf = await markdownToAdf(markdown);
  t.deepEqual(adf, textEdgeCases);
});

test(`Can convert tables correctly`, async (t) => {
  const markdown = `| **First Header** | Second Header |
| ------------- | ------------- |
| Content Cell  | ![Example Image](https://picsum.photos/400/300) Image with text in cell |
| ~~Content Cell~~  | Content Cell  |
| | |`;

  const adf = await markdownToAdf(markdown);
  t.deepEqual(adf, tableAdf);
});

test(`Handles special characters correctly`, async (t) => {
  const markdown = `# Special Characters Test

## Unicode and Emojis
Text with emojis: 🚀 🎉 ✨ 💻 📝

## Accented Characters
Café, naïve, résumé, piñata, Zürich

## Mathematical Symbols
Equations: α + β = γ, ∑(x²), √16 = 4, π ≈ 3.14159

## Currency and Symbols
Prices: $100, €50, ¥1000, £75, ₹500
Symbols: ©2024, ®, ™, °C, ±5%

## Special Punctuation
Quotes: "Hello" 'World' „German" «French»
Dashes: em—dash, en–dash, hyphen-dash
Ellipsis: Wait... for it…

## Escaped Markdown Characters
Literal asterisks: \\*not bold\\*, \\**not bold\\**
Literal underscores: \\_not italic\\_, \\__not bold\\__
Literal backticks: \\\`not code\\\`
Literal hash: \\# not heading

## Mixed Content
**Bold with émojis: 🔥 café** and *italic with symbols: α±β*

[Link with special chars](https://example.com/café?param=value&other=™)

\`Code with symbols: const π = Math.PI; // ≈ 3.14159\`

## Code Block with Special Characters
\`\`\`javascript
// Special chars in code
const greeting = "Hello 🌍!";
const price = "€25.99";
console.log(\`Price: \${price}\`);
\`\`\`

## Table with Special Characters
| Symbol | Description | Unicode |
|--------|-------------|---------|
| 🚀 | Rocket | U+1F680 |
| café ☕ | Coffee shop | Mixed |
| α + β | Math symbols | Greek |

> Blockquote with special characters: "Wisdom is knowing that you don't know." — Socrates ⭐`;

  const adf = await markdownToAdf(markdown);
  t.deepEqual(adf, specialCharsAdf);
});

//
// GFM
//

// Helper function to normalize UUIDs for testing
function normalizeAdfForTesting(adf: any): any {
  const normalized = JSON.parse(JSON.stringify(adf));
  let taskListCounter = 0;
  let taskItemCounter = 0;

  function traverse(node: any) {
    if (node.type === "taskList" && node.attrs?.localId) {
      node.attrs.localId = `test-task-list-id${taskListCounter > 0 ? `-${taskListCounter}` : ""}`;
      taskListCounter++;
    }
    if (node.type === "taskItem" && node.attrs?.localId) {
      taskItemCounter++;
      node.attrs.localId = `test-task-item-id-${taskItemCounter}`;
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
  }

  if (normalized.content) {
    normalized.content.forEach(traverse);
  }

  return normalized;
}

test(`Can convert GFM task lists`, async (t) => {
  const markdown = `- [ ] Foo bar
- [ ] Baz yo`;

  const adf = await markdownToAdf(markdown);
  const normalizedAdf = normalizeAdfForTesting(adf);
  t.deepEqual(normalizedAdf, taskListAdf);
});

test(`Can convert nested GFM task lists with checked and unchecked items`, async (t) => {
  const markdown = `- [x] Completed task
- [ ] Incomplete task
  - [x] Nested completed
  - [ ] Nested incomplete`;

  const adf = await markdownToAdf(markdown);
  const normalizedAdf = normalizeAdfForTesting(adf);
  t.deepEqual(normalizedAdf, nestedTaskListAdf);
});

test(`Can handle task lists with formatting`, async (t) => {
  const markdown = `- [x] **Bold** task
- [ ] *Italic* task with [link](https://example.com)
- [ ] \`Code\` task`;

  const adf = await markdownToAdf(markdown);
  const normalizedAdf = normalizeAdfForTesting(adf);

  // Check that it's a task list
  t.is(normalizedAdf.content[0].type, "taskList");
  t.is(normalizedAdf.content[0].content.length, 3);

  // Check first item has bold formatting
  const firstItem = normalizedAdf.content[0].content[0];
  t.is(firstItem.attrs.state, "DONE");
  t.is(firstItem.content[0].marks[0].type, "strong");

  // Check second item has italic and link
  const secondItem = normalizedAdf.content[0].content[1];
  t.is(secondItem.attrs.state, "TODO");
  t.truthy(
    secondItem.content.some((node: any) =>
      node.marks?.some((mark: any) => mark.type === "em"),
    ),
  );
  t.truthy(
    secondItem.content.some((node: any) =>
      node.marks?.some((mark: any) => mark.type === "link"),
    ),
  );

  // Check third item has code formatting
  const thirdItem = normalizedAdf.content[0].content[2];
  t.is(thirdItem.attrs.state, "TODO");
  t.truthy(
    thirdItem.content.some((node: any) =>
      node.marks?.some((mark: any) => mark.type === "code"),
    ),
  );
});

test(`Handles mixed regular and task list items correctly`, async (t) => {
  const markdown = `- Regular item
- [ ] Task item
- Another regular item`;

  const adf = await markdownToAdf(markdown);

  // Mixed lists should be treated as regular bullet lists
  const firstContent = adf.content[0];
  t.is(firstContent?.type, "bulletList");
  t.truthy(firstContent?.content);
  t.is(firstContent?.content?.length, 3);

  // All items should be regular list items
  firstContent?.content?.forEach((item: any) => {
    t.is(item.type, "listItem");
  });
});
