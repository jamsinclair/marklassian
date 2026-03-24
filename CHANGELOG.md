# Changelog

## 1.2.1

### Bug Fixes

- Handle escape tokens in inlineToAdf ([#8](https://github.com/jamsinclair/marklassian/pull/8))

## 1.2.0

### New Features

- Added support for embedding raw ADF nodes in Markdown via `<adf>…</adf>` tags. Content must be a valid JSON object or array of objects, each with a `type` string property. Invalid content throws with a descriptive error.

## 1.1.0

### New Features

- Added ADF support for task lists (GitHub Flavoured Markdown feature)
    - Thank you @sharmrt-v for the contribution [#4](https://github.com/jamsinclair/marklassian/pull/4)

## 1.0.4

### Changes

- Update `marked` dependency range to optionally support version 16.0.0

## 1.0.3

### Bug Fixes

- Fixes invalid ADF being generated when there are empty table cells ([#3](https://github.com/jamsinclair/marklassian/pull/3))

## 1.0.2

### Bug Fixes

- Fixes issues for code blocks without a language. Defaults to `text` language if no language is specified ([#1](https://github.com/jamsinclair/marklassian/pull/1))
