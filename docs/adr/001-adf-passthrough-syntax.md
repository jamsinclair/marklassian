---
status: accepted
date: 2026-03-03
author: Phoenix
---

# 001. ADF passthrough syntax

## Context

Marklassian converts Markdown to ADF. Some ADF constructs — Confluence macros
(`extension`, `bodiedExtension`), panels, status badges, dates, mentions — have
no Markdown equivalent. A coding agent building a Confluence page as a Markdown
string currently has no way to include these nodes; the only workaround is to
abandon Markdown and construct the entire ADF document by hand.

We need a mechanism that lets an agent (or human) embed arbitrary ADF nodes
inline within a Markdown document, without requiring a new authoring syntax or
a change to the public API.

## Options

### Option 1: Do nothing

Leave the library as-is. Users who need ADF nodes with no Markdown equivalent
must construct the full ADF document manually or use the heavier official
Atlaskit libraries.

**Pros:** No code change; library stays minimal.
**Cons:** Blocks the mixed-content use case entirely; forces users to a much
heavier dependency for what may be a small number of macro nodes.
**Risks:** None to the library; friction for users.

### Option 2: HTML passthrough — `<adf>` tag (selected)

`marked` already tokenises unrecognised HTML blocks as `"html"` tokens, which
marklassian currently drops. We handle `<adf>…</adf>` as a special case:
parse the inner JSON and return the object (or objects, if an array) directly
as ADF node(s). Any other HTML tag continues to be ignored.

Content must be a valid JSON object with a `"type"` string, or a JSON array of
such objects. Invalid JSON or a missing `"type"` throws with a descriptive
message.

**Pros:** Zero API change; works for any ADF node type; agents embed the same
JSON they would write for a full ADF document; minimal implementation (~30
lines); `<adf>` does not collide with any real HTML element.
**Cons:** Raw JSON inside a Markdown string is not pleasant for human authors
writing by hand; errors surface at conversion time rather than authoring time.
**Risks:** A future HTML element named `<adf>` would conflict (extremely
unlikely; not a standard or proposed HTML element).

### Option 3: Custom `marked` extension with shorthand syntax

Register a `marked` lexer extension (via `marked.use()`) to tokenise a new
syntax — e.g. a fenced block ` ```adf:extension ` or a directive `:::macro`.
The extension maps shorthand macro names and parameters to ADF nodes.

**Pros:** More ergonomic for human authors; syntax is visually distinct from
prose.
**Cons:** Requires a `marked` extension and a maintained mapping of macro
shorthands; shorthands are either limited in scope or devolve into JSON anyway;
adds significant complexity for uncertain ergonomic gain; LLMs don't have a
shared convention for the custom syntax.
**Risks:** Syntax collisions (e.g. a fenced block looks like a code block to
unaware parsers); ongoing maintenance as new macro types are needed.

### Option 4: Structured API — mixed input type

Change the API to accept either a plain string or an array of
`{ type: 'markdown', content: string } | { type: 'adf', node: AdfNode }`
slots, or a placeholder/injection map.

**Pros:** Full type safety at the call site; ADF nodes are typed objects, not
embedded strings.
**Cons:** Breaking API change (or complex union overload); agents must build two
separate data structures and coordinate positions; incompatible with a
streaming/string-based authoring workflow.
**Risks:** Increased API surface; harder for agents that generate a single
contiguous string.

## Decision

Adopt **Option 2**. The primary consumers of this feature are coding agents
that already know ADF JSON. Wrapping a JSON object in `<adf>` tags requires
one additional sentence in a tool description and imposes no token overhead on
the generated content. The implementation is minimal, the API is unchanged, and
any ADF node type is supported without further library changes.

Array input (`<adf>[{...}, {...}]</adf>`) is also supported so that agents have
flexibility in how they structure multi-node embeddings.

## Consequences

**Positive:** Agents can produce mixed Markdown + ADF documents with a single
`markdownToAdf()` call; no new dependencies; all ADF node types supported
immediately.
**Negative:** Human authors embedding complex macros must write raw JSON by
hand; validation is runtime-only.
