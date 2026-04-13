# Inline `<adf>` tag support — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow `<adf>…</adf>` tags to appear inline within markdown (paragraphs, table cells, etc.) and emit the embedded ADF node(s) into the surrounding content.

**Architecture:** Register a marked inline extension at module init time that matches the full `<adf>…</adf>` pattern as a single `adf_inline` token. Extend `inlineToAdf` to handle `adf_inline` tokens by delegating to the existing `parseAdfTag` function.

**Tech Stack:** TypeScript, [marked](https://marked.js.org/) (v15/v16), [ava](https://github.com/avajs/ava) (test runner), tsimp (TS loader for ava)

---

### Task 1: Write failing tests for inline `<adf>` — happy path and error cases

**Files:**
- Modify: `lib/test/adf-passthrough.test.ts`

Tests use ava. Run a single test file with: `npx ava test/adf-passthrough.test.ts`

Write all tests **before** the implementation in Task 2, so you can confirm each fails for the right reason before the feature exists.

- [ ] **Step 1: Add the happy-path tests**

Add the following to `lib/test/adf-passthrough.test.ts`:

```ts
// --- inline happy path ---

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
```

- [ ] **Step 2: Add the error case tests**

```ts
// --- inline error cases ---

test("throws on malformed JSON inside inline <adf> tags", (t) => {
  t.throws(() => markdownToAdf("text <adf>not valid json</adf> more."), {
    message: /Invalid JSON in <adf> tag/,
  });
});

test("throws when inline <adf> content is a valid object but missing type", (t) => {
  t.throws(
    () => markdownToAdf('text <adf>{"attrs":{"level":1}}</adf> more.'),
    { message: /ADF node must have a "type" string/ },
  );
});

test("throws when inline <adf> tag is empty", (t) => {
  t.throws(() => markdownToAdf("text <adf></adf> more."), {
    message: /<adf> tag content is empty/,
  });
});
```

- [ ] **Step 3: Run the tests to confirm they all fail**

Run: `npx ava test/adf-passthrough.test.ts`

Expected: the seven new tests fail (unknown token type / wrong output / no error thrown), all existing tests pass.

- [ ] **Step 4: Commit the tests**

```bash
git add lib/test/adf-passthrough.test.ts && git commit -m "test: add failing tests for inline <adf> tag support"
```

---

### Task 2: Implement the inline extension and make all new tests pass

**Files:**
- Modify: `lib/index.ts`

The marked `use()` API accepts an `extensions` array. Each extension needs `name`, `level: 'inline'`, `start()`, `tokenizer()`, and `renderer()`. We register it once at module scope so it applies to every `marked.lexer()` call.

- [ ] **Step 1: Add the `AdfInlineToken` type to `lib/index.ts`**

Add this type alongside the existing `AdfNode`, `AdfMark`, `AdfDocument`, and `RelaxedToken` types:

```ts
type AdfInlineToken = {
  type: "adf_inline";
  raw: string;
  adfJson: string;
};
```

- [ ] **Step 2: Add the inline extension registration to `lib/index.ts`**

Insert the following block immediately after the type definitions (before `generateLocalId`):

```ts
/**
 * Inline marked extension that intercepts <adf>…</adf> tags appearing within
 * inline content (paragraphs, table cells, headings, etc.) and produces a
 * single `adf_inline` token carrying the raw JSON string. Without this
 * extension, marked's inline lexer splits the tag into four separate tokens
 * (html, text, html, text), making it impossible to parse.
 */
marked.use({
  extensions: [
    {
      name: "adf_inline",
      level: "inline" as const,
      start(src: string) {
        return src.indexOf("<adf>");
      },
      tokenizer(src: string): AdfInlineToken | undefined {
        const match = src.match(/^<adf>([\s\S]*?)<\/adf>/i);
        if (match) {
          return {
            type: "adf_inline",
            raw: match[0],
            adfJson: match[1]!.trim(),
          };
        }
      },
      // renderer is required by the marked extension interface but is not
      // relevant here — marklassian never renders to HTML.
      renderer() {
        return "";
      },
    },
  ],
});
```

- [ ] **Step 3: Add the `adf_inline` case to `inlineToAdf`**

In the `flatMap` switch inside `inlineToAdf` (currently ending with `case "br":`), add before `default`:

```ts
case "adf_inline": {
  const node = parseAdfTag(
    `<adf>${(token as AdfInlineToken).adfJson}</adf>`,
  );
  if (!node) return [];
  return Array.isArray(node) ? node : [node];
}
```

- [ ] **Step 4: Run the full test suite**

Run: `npx ava`

Expected: all tests pass.

- [ ] **Step 5: Build to verify no type errors**

Run: `npm run build`

Expected: no TypeScript errors, `dist/` updated.

- [ ] **Step 6: Commit**

```bash
git add lib/index.ts && git commit -m "feat: support inline <adf> tags via marked inline extension"
```

---

### Task 3: Remove the superseded non-regression test

**Files:**
- Modify: `lib/test/adf-passthrough.test.ts`

The test `"does not parse inline <adf> tags (block-level only)"` documented the old limitation. It is now fully covered by the happy-path tests added in Task 1 and should be deleted.

- [ ] **Step 1: Delete the test**

Remove the following test from `lib/test/adf-passthrough.test.ts` entirely:

```ts
test("does not parse inline <adf> tags (block-level only)", (t) => {
  // When <adf> appears inline, marked treats it as inline HTML and the JSON
  // leaks into the paragraph text — this documents the known limitation.
  const result = markdownToAdf(
    'Some text <adf>{"type":"rule"}</adf> more text.',
  );
  t.is(result.content.length, 1);
  t.is(result.content[0]!.type, "paragraph");
});
```

- [ ] **Step 2: Run the full test suite**

Run: `npx ava`

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/test/adf-passthrough.test.ts && git commit -m "test: remove superseded inline <adf> limitation test"
```

---

### Task 4: Update README

**Files:**
- Modify: `README.md`

The README currently warns that inline `<adf>` is unsupported. Replace the warning with a note that both block-level and inline placement are supported, with an example.

- [ ] **Step 1: Find and update the caveat**

Locate this paragraph in `README.md`:

```
⚠️ Please note
- `<adf>` must appear as a block-level element — surrounded by blank lines. Inline placement (e.g. inside a sentence) will result in the tag being treated as inline HTML and the content will not be parsed as ADF.
```

Replace with:

```markdown
⚠️ Please note
- `<adf>` can appear either as a block-level element (surrounded by blank lines) or inline within a paragraph or table cell. Inline placement embeds the ADF node(s) into the surrounding paragraph content:

  ```markdown
  See the <adf>{"type":"inlineCard","attrs":{"url":"https://example.com"}}</adf> card above.

  | Status | Notes |
  | --- | --- |
  | <adf>{"type":"emoji","attrs":{"shortName":":white_check_mark:","text":"✅"}}</adf> Done | All good |
  ```
```

- [ ] **Step 2: Build (copies README into lib/)**

Run: `npm run build`

Expected: no errors, `lib/README.md` updated.

- [ ] **Step 3: Commit**

```bash
git add README.md && git commit -m "docs: update README to document inline <adf> tag support"
```

---

### Task 5: Final verification

- [ ] **Step 1: Run the full test suite one last time**

Run: `npx ava`

Expected: all tests pass, no failures.

- [ ] **Step 2: Build**

Run: `npm run build`

Expected: no TypeScript errors.
