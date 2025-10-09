import { query, SDKUserMessage, tool } from "@anthropic-ai/claude-agent-sdk";

import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { optionsWithCleanEnv } from "../utils.js";

const multiToolServer = createSdkMcpServer({
  name: "utilities",
  version: "1.0.0",
  tools: [
    tool(
      "calculate",
      "Perform calculations",
      {
        /* ... */
      },
      async (_args) => {
        return {
          content: [{ type: "text", text: "5 + 3 = 8" }],
          isError: false,
        };
      }
    ),
    tool(
      "translate",
      "Translate text",
      {
        /* ... */
      },
      async (_args) => {
        return {
          content: [{ type: "text", text: "hello = hola" }],
          isError: false,
        };
      }
    ),
    tool(
      "search_web",
      "Search the web",
      {
        /* ... */
      },
      async (_args) => {
        return {
          content: [
            {
              type: "text",
              text: "Search the web and the result is https://www.google.com",
            },
          ],
          isError: false,
        };
      }
    ),
  ],
});

// Allow only specific tools with streaming input
async function* generateMessages(): AsyncIterable<SDKUserMessage> {
  yield {
    type: "user" as const,
    message: {
      role: "user" as const,
      content:
        "Calculate 5 + 3 and translate 'hello' to Spanish and search the web for the url i need",
    },
  } as SDKUserMessage; // 类型断言，因为根据TS类型，里面缺少parent_tool_use_id和session_id
}

for await (const message of query({
  prompt: generateMessages(), // Use async generator for streaming input
  options: {
    ...optionsWithCleanEnv,
    mcpServers: {
      utilities: multiToolServer,
    },
    allowedTools: [
      "mcp__utilities__calculate", // Allow calculator
      "mcp__utilities__translate", // Allow translator
      // "mcp__utilities__search_web" is NOT allowed
    ],
  },
})) {
  // Process messages
  console.log(JSON.stringify(message, null, 2));
  console.log("\n---\n");
}
