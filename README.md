# Marklassian

A lightweight JavaScript library that transforms Markdown to the [Atlassian Document Format (ADF)](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/). Built for easy integration with Atlassian products and APIs.

Visit our [interactive playground](https://marklassian.netlify.app/playground) to experiment with Markdown to ADF conversion in real-time.

[![npm version](https://img.shields.io/npm/v/marklassian.svg)](https://www.npmjs.com/package/marklassian)
[![license](https://img.shields.io/npm/l/marklassian.svg)](https://github.com/jamsinclair/marklassian/blob/main/LICENSE.md)

## Features

- Convert Markdown to ADF with a single function call
- Support for the most common Markdown syntax
- TypeScript-ready with full type definitions
- Works in all modern JavaScript environments (Browsers, Node.js, Deno, Bun)

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

## References

For those interested in the ADF format, the following resources may be helpful:
- [Atlassian Document Format (ADF) Reference](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/)
- [Atlassian Document Format Interactive Builder](https://developer.atlassian.com/cloud/jira/platform/apis/document/playground/)
- [@atlaskit/adf-utils](https://www.npmjs.com/package/@atlaskit/adf-utils), an official Atlassian library for working with ADF documents. Provides validation and a Java-like builder API for creating ADF documents.

## License

MIT
