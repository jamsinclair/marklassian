# Marklassian

A lightweight JavaScript library that transforms Markdown to the [Atlassian Document Format (ADF)](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/). Built for easy integration with Atlassian products and APIs.

Visit our [interactive playground](https://marklassian.netlify.app/playground) to experiment with Markdown to ADF conversion in real-time.

[![npm version](https://img.shields.io/npm/v/marklassian.svg)](https://www.npmjs.com/package/marklassian)
[![license](https://img.shields.io/npm/l/marklassian.svg)](https://github.com/jamsinclair/marklassian/blob/main/LICENSE.md)
[![bundlephobia minzipped size](https://badgen.net/bundlephobia/minzip/marklassian)](https://bundlephobia.com/package/marklassian)

## Features

- Convert Markdown to ADF with a single function call
- Support for the most common Markdown syntax
- TypeScript-ready with full type definitions
- Works in all modern JavaScript environments (Browsers, Node.js, Deno, Bun)
- Lightweight ([12kb gzipped and minified](https://bundlephobia.com/package/marklassian)), doesn't depend on AtlasKit dependencies

## Installation

```bash
npm install marklassian
```

## Usage

```javascript
import { markdownToAdf } from 'marklassian';

const markdown = '# Hello World';
const adf = markdownToAdf(markdown);
```

## Supported Markdown Features

- Headings (H1-H6)
- Paragraphs and line breaks
- Emphasis (bold, italic, strikethrough)
- Links and images
- Code blocks with language support
- Ordered and unordered lists with nesting
- Blockquotes
- Horizontal rules
- Tables
- Task lists (GitHub Flavoured Markdown feature)

## API Reference

### `markdownToAdf(markdown: string): AdfDocument`

Converts a Markdown string to an ADF document object (JSON serialisable).

### Types

```typescript
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
    type: 'doc';
    content: AdfNode[];
};
```

## Caveats

Marklassian aims to provide a lightweight, fast and mostly accurate conversion from Markdown to ADF.

If you have complex Markdown or require strict conformance to the ADF format, you may need want to use the official Atlassian libraries. These are hefty dependencies that may bloat your project and require manual tree shaking.

The following example demonstrates how to use the official Atlassian libraries for Markdown to ADF conversion:

```javascript
import { defaultSchema } from '@atlaskit/adf-schema';
import { JSONTransformer } from '@atlaskit/editor-json-transformer';
import { MarkdownTransformer } from '@atlaskit/editor-markdown-transformer';

const jsonTransformer = new JSONTransformer();
const markdownTransformer = new MarkdownTransformer(defaultSchema);

const markdownDocument = '';
const adfDocument = jsonTransformer.encode(markdownTransformer.parse(markdownDocument));
```

Sourced from <https://jira.atlassian.com/browse/JRACLOUD-77436>

## References

For those interested in the ADF format, the following resources may be helpful:
- [Atlassian Document Format (ADF) Reference](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/)
- [Atlassian Document Format Interactive Builder](https://developer.atlassian.com/cloud/jira/platform/apis/document/playground/)
- [@atlaskit/adf-utils](https://www.npmjs.com/package/@atlaskit/adf-utils), an official Atlassian library for working with ADF documents. Provides validation and a Java-like builder API for creating ADF documents.

## License

MIT
