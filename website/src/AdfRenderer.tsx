import { ReactRenderer } from "@atlaskit/renderer";
import { useEffect, useState } from "react";

let hasReRendered = false;

function AdfRenderer({ document }: { document: any }) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (hasReRendered) return;

    setTimeout(() => {
        // Hack to force re-render.
        // Code block rendering seems to be broken on first render.
        // Atlaskit is a prime example of conway's law in action.
        // Don't have time to fix this properly.
        setKey((key) => key + 1);
        hasReRendered = true;
    }, 800);
  }, []);

  return <ReactRenderer key={key} document={document} />;
}

export default AdfRenderer;
