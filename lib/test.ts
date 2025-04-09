import anyTest, {type TestFn} from 'ava';
import { markdownToAdf } from "./index";
import basicsAdf from "./fixtures/basics.json" with { type: "json" };;
import nestedListAdf from "./fixtures/nested-list.json" with { type: "json" };;
import inlineCodeAdf from "./fixtures/inline-code-marks.json" with { type: "json" };;
import codeBlocksAdf from "./fixtures/code-blocks.json" with { type: "json" };;
import tableAdf from "./fixtures/table.json" with { type: "json" };;
import textEdgeCases from "./fixtures/text-edge-cases.json" with { type: "json" };;

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

> This is a blockquote

\`\`\`typescript
const hello = "world";
console.log(hello);
\`\`\``;
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
| ~~Content Cell~~  | Content Cell  |`;

  const adf = await markdownToAdf(markdown);
  t.deepEqual(adf, tableAdf);
});
