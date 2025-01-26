import { Link } from "react-router";

function ApiReference() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Marklassian</h2>
        <p className="text-lg text-gray-600 mb-4">
          A lightweight JavaScript library that converts Markdown to the{" "}
          <a
            href="https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/"
            className="text-blue-600 hover:text-blue-400"
          >
            Atlassian Document Format (ADF)
          </a>
          . Built for easy integration with Atlassian products and APIs.
          Supports modern Browsers, Node.js, Deno, Bun and other good JavaScript
          environments.
        </p>
        <p className="text-lg text-gray-600">
          Try out our{" "}
          <Link to="/playground" className="text-blue-600 hover:text-blue-400">
            interactive playground
          </Link>{" "}
          to experiment with Markdown conversion in real-time and preview the
          generated ADF output
        </p>
        <Link
          to="/playground"
          className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try the Playground
        </Link>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Installation</h2>
        <div className="bg-gray-900 rounded-lg p-4">
          <code className="text-green-400">npm install marklassian</code>
        </div>
      </section>

      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-2xl font-semibold">API Reference</h2>
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-medium mb-2">
              markdownToAdf(markdown: string): AdfDocument
            </h3>
            <p className="text-gray-600 mb-4">
              Converts a Markdown string to an ADF document object (JSON
              Serialisable).
            </p>
            <div className="bg-gray-100 rounded-lg p-4 overflow-auto">
              <pre className="text-sm">
                {`import { markdownToAdf } from 'marklassian';

const markdown = '# Hello World';
const adf = markdownToAdf(markdown);`}
              </pre>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">
              Supported Markdown Features
            </h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Headings (H1-H6)</li>
              <li>Paragraphs and line breaks</li>
              <li>Emphasis (bold, italic, strikethrough)</li>
              <li>Links and images</li>
              <li>Code blocks with language support</li>
              <li>Ordered and unordered lists with nesting</li>
              <li>Blockquotes</li>
              <li>Horizontal rules</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Types</h3>
            <div className="bg-gray-100 rounded-lg p-4 overflow-auto">
              <pre className="text-sm">
                {`type AdfNode = {
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
`}
              </pre>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ApiReference;
