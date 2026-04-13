# Inline `<adf>` tag support — design spec

## Goal

Allow `<adf>…</adf>` tags to appear inline within markdown (inside paragraphs, table cells, headings, etc.), emitting the embedded ADF node(s) into the surrounding content array — not just as top-level block nodes.

## Background

The existing block-level `<adf>` feature intercepts `html` tokens in the block lexer pass (`tokensToAdf`). When `<adf>` appears inline, marked's inline lexer splits it into four separate tokens (`html(<adf>)`, `text(json)`, `html(</adf>)`, surrounding text), making it impossible to handle via the existing code path.

## Use cases

- **Inline ADF nodes in paragraphs:** `inlineCard`, Atlassian emoji, user `@mention`, `date`, `status` — ADF nodes that live in a paragraph's `content` array.
- **ADF nodes in table cells:** markdown tables only support single-line cell content; `<adf>` inline lets users embed any ADF node (block or inline) inside a cell.

## Scope

- `<adf>` contents are passed through verbatim — no validation of whether the node type is valid inline vs block ADF. The user is responsible for correctness.
- Both single object and JSON array forms are supported, consistent with block-level.
- Error handling is identical to block-level: throws on invalid JSON, missing `type` property, empty tag, or non-object values.

## Architecture

Register a custom marked **inline extension** at module initialisation time (once, not per call). The extension matches the full `<adf>…</adf>` construct as a single token before the default inline tokenizer splits it. It produces a custom token type `adf_inline` carrying the raw JSON string. `inlineToAdf` is extended to handle `adf_inline` tokens by delegating to the existing `parseAdfTag` function.

```
markdown string
    │
    ▼
marked.lexer  ◄── inline extension intercepts <adf>…</adf>
    │                produces { type: 'adf_inline', adfJson: '…' }
    ▼
tokensToAdf / processParagraph / processTable
    │
    ▼
inlineToAdf
    │  case 'adf_inline':
    │      parseAdfTag(`<adf>${token.adfJson}</adf>`)
    │
    ▼
AdfNode[]
```

## Token shape

```ts
{ type: 'adf_inline', raw: '<adf>…</adf>', adfJson: '{"type":"rule"}' }
```

- `raw`: full matched string (required by marked)
- `adfJson`: trimmed content between the tags, passed directly to `parseAdfTag`

## Key design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Extension registration | Module init (not per-call) | marked extensions are global; registering once avoids duplication |
| Validation | Reuse `parseAdfTag` | Identical error behaviour to block-level; single source of truth |
| Table cell support | Automatic | Table cells already route through `inlineToAdf`; no extra handling needed |
| Block vs inline node types | User's responsibility | Library cannot know whether a given ADF node is contextually valid |

## Files affected

| File | Change |
|---|---|
| `lib/index.ts` | Register inline extension; add `adf_inline` case in `inlineToAdf` |
| `lib/test/adf-passthrough.test.ts` | Add inline happy-path and error tests; update non-regression test |
| `README.md` | Replace inline-unsupported caveat with inline usage example |

## Tests

### Happy path
- Inline `<adf>` with single object in a paragraph
- Inline `<adf>` with JSON array in a paragraph
- `<adf>` inside a table cell (single object)
- Inline `<adf>` surrounded by other inline markdown (bold, links)

### Error cases (inline)
- Invalid JSON → throws `Invalid JSON in <adf> tag`
- Missing `type` → throws `ADF node must have a "type" string property`
- Empty tag → throws `<adf> tag content is empty`

### Non-regression
- Existing test `"does not parse inline <adf> tags (block-level only)"` updated to assert the new supported behaviour
- All existing block-level tests continue to pass
