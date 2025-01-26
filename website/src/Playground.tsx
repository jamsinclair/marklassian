import { useState, useCallback, useMemo, Suspense, lazy } from "react";
import { Copy, Code2, Eye } from "lucide-react";
import { markdownToAdf } from "marklassian";
import AdfValidCheck from "./AdfValidCheck";

const DEFAULT_MARKDOWN = `# Hello World

This is a **bold** and *italic* text.

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
\`\`\`
`;

const DynamicAdfRenderer = lazy(() => import("./AdfRenderer"));

const Skeleton = () => (
  <div className="space-y-3">
    <div className="h-4 bg-gray-200 rounded animate-pulse" />
    <div className="h-4 bg-gray-200 rounded animate-pulse w-11/12" />
    <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
    <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
    <div className="h-4 bg-gray-200 rounded animate-pulse w-11/12" />
    <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
    <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
    <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
    <style>{`
        @keyframes customPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse {
          animation: customPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
  </div>
);

function Playground() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"code" | "preview">("code");

  const adfOutput = useMemo(() => markdownToAdf(markdown), [markdown]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(adfOutput, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [adfOutput]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Panel */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-medium text-gray-900">Markdown Input</h2>
        </div>
        <div className="p-4">
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="w-full h-[600px] font-mono text-sm p-4 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your markdown here..."
          />
        </div>
      </div>

      {/* Output Panel */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-medium text-gray-900">ADF Output</h2>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("code")}
                className={`flex items-center px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === "code"
                    ? "bg-white shadow text-gray-900"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Code2 className="h-4 w-4 mr-1" />
                Code
              </button>
              <button
                onClick={() => setViewMode("preview")}
                className={`flex items-center px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === "preview"
                    ? "bg-white shadow text-gray-900"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </button>
            </div>
          </div>
          <AdfValidCheck json={JSON.stringify(adfOutput)} />
          {viewMode === "code" && (
            <button
              onClick={handleCopy}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Copy className="h-4 w-4 mr-1" />
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
        <div className="p-4">
          {viewMode === "code" ? (
            <pre className="w-full h-[600px] overflow-auto bg-gray-50 rounded-md p-4 text-sm font-mono">
              {JSON.stringify(adfOutput, null, 2)}
            </pre>
          ) : (
            <Suspense fallback={<Skeleton />}>
              <DynamicAdfRenderer document={adfOutput} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}

export default Playground;
