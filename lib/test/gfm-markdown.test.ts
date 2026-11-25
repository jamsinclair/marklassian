import anyTest, { type TestFn } from "ava";
import { markdownToAdf } from "../index";

import taskListAdf from "./fixtures/gfm-task-list.json" with { type: "json" };
import nestedTaskListAdf from "./fixtures/gfm-nested-task-list.json" with {
  type: "json",
};

const test = anyTest as unknown as TestFn<void>;

// Helper function to normalize UUIDs for testing
function normalizeAdfForTesting(adf: any): any {
  const normalized = JSON.parse(JSON.stringify(adf));
  let taskListCounter = 0;
  let taskItemCounter = 0;

  function traverse(node: any) {
    if (node.type === "taskList" && node.attrs?.localId) {
      node.attrs.localId = `test-task-list-id${taskListCounter > 0 ? `-${taskListCounter}` : ""}`;
      taskListCounter++;
    }
    if (node.type === "taskItem" && node.attrs?.localId) {
      taskItemCounter++;
      node.attrs.localId = `test-task-item-id-${taskItemCounter}`;
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
  }

  if (normalized.content) {
    normalized.content.forEach(traverse);
  }

  return normalized;
}

test(`Can convert GFM task lists`, async (t) => {
  const markdown = `- [ ] Foo bar
- [ ] Baz yo`;

  const adf = await markdownToAdf(markdown);
  const normalizedAdf = normalizeAdfForTesting(adf);
  t.deepEqual(normalizedAdf, taskListAdf);
});

test(`Can convert nested GFM task lists with checked and unchecked items`, async (t) => {
  const markdown = `- [x] Completed task
- [ ] Incomplete task
  - [x] Nested completed
  - [ ] Nested incomplete`;

  const adf = await markdownToAdf(markdown);
  const normalizedAdf = normalizeAdfForTesting(adf);
  t.deepEqual(normalizedAdf, nestedTaskListAdf);
});

test(`Can handle task lists with formatting`, async (t) => {
  const markdown = `- [x] **Bold** task
- [ ] *Italic* task with [link](https://example.com)
- [ ] \`Code\` task`;

  const adf = await markdownToAdf(markdown);
  const normalizedAdf = normalizeAdfForTesting(adf);

  // Check that it's a task list
  t.is(normalizedAdf.content[0].type, "taskList");
  t.is(normalizedAdf.content[0].content.length, 3);

  // Check first item has bold formatting
  const firstItem = normalizedAdf.content[0].content[0];
  t.is(firstItem.attrs.state, "DONE");
  t.is(firstItem.content[0].marks[0].type, "strong");

  // Check second item has italic and link
  const secondItem = normalizedAdf.content[0].content[1];
  t.is(secondItem.attrs.state, "TODO");
  t.truthy(
    secondItem.content.some((node: any) =>
      node.marks?.some((mark: any) => mark.type === "em"),
    ),
  );
  t.truthy(
    secondItem.content.some((node: any) =>
      node.marks?.some((mark: any) => mark.type === "link"),
    ),
  );

  // Check third item has code formatting
  const thirdItem = normalizedAdf.content[0].content[2];
  t.is(thirdItem.attrs.state, "TODO");
  t.truthy(
    thirdItem.content.some((node: any) =>
      node.marks?.some((mark: any) => mark.type === "code"),
    ),
  );
});

test(`Handles mixed regular and task list items correctly`, async (t) => {
  const markdown = `- Regular item
- [ ] Task item
- Another regular item`;

  const adf = await markdownToAdf(markdown);

  // Mixed lists should be treated as regular bullet lists
  const firstContent = adf.content[0];
  t.is(firstContent?.type, "bulletList");
  t.truthy(firstContent?.content);
  t.is(firstContent?.content?.length, 3);

  // All items should be regular list items
  firstContent?.content?.forEach((item: any) => {
    t.is(item.type, "listItem");
  });
});

test(`Places regular sub-lists of task items after the task list`, async (t) => {
  const markdown = `- [ ] Task
  - Sub item
- [x] Next task`;

  const adf = await markdownToAdf(markdown);
  const normalizedAdf = normalizeAdfForTesting(adf);

  t.deepEqual(normalizedAdf.content, [
    {
      type: "taskList",
      attrs: { localId: "test-task-list-id" },
      content: [
        {
          type: "taskItem",
          attrs: { localId: "test-task-item-id-1", state: "TODO" },
          content: [{ type: "text", text: "Task" }],
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Sub item" }],
            },
          ],
        },
      ],
    },
    {
      type: "taskList",
      attrs: { localId: "test-task-list-id-1" },
      content: [
        {
          type: "taskItem",
          attrs: { localId: "test-task-item-id-2", state: "DONE" },
          content: [{ type: "text", text: "Next task" }],
        },
      ],
    },
  ]);
});

test(`Task items only contain inline content`, async (t) => {
  const markdown = `- [ ] Task
  - [ ] Nested task
    - Sub item
  \`\`\`
  code
  \`\`\``;

  const adf = await markdownToAdf(markdown);

  function assertInline(node: any) {
    if (node.type === "taskItem") {
      for (const child of node.content) {
        t.true(["text", "hardBreak"].includes(child.type));
      }
    }
    node.content?.forEach(assertInline);
  }

  adf.content.forEach(assertInline);
  t.deepEqual(
    adf.content.map((node) => node.type),
    ["taskList", "bulletList", "codeBlock"],
  );
});

test(`Uses custom generateLocalId for task lists and items`, (t) => {
  const counts: Record<string, number> = {};
  const generateLocalId = (nodeType: string) => {
    counts[nodeType] = (counts[nodeType] ?? 0) + 1;
    return `${nodeType}-${counts[nodeType]}`;
  };
  const markdown = `- [ ] Foo\n- [x] Bar`;

  const adf = markdownToAdf(markdown, { generateLocalId });
  const list = adf.content[0]!;

  t.is(list.attrs?.localId, "taskList-1");
  t.deepEqual(
    list.content!.map((item) => item.attrs?.localId),
    ["taskItem-1", "taskItem-2"],
  );
});

test(`Custom generateLocalId does not leak into later calls`, (t) => {
  markdownToAdf(`- [ ] Foo`, { generateLocalId: () => "fixed" });
  const adf = markdownToAdf(`- [ ] Foo`);

  t.not(adf.content[0]!.attrs?.localId, "fixed");
});
