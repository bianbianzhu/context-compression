import "dotenv/config";
import { query, Query } from "@anthropic-ai/claude-agent-sdk";
import { optionsWithCleanEnv } from "./utils.js";

import { AnthropicMessagesModelId } from "@langchain/anthropic";

const model: AnthropicMessagesModelId = "claude-sonnet-4-5";

export async function basicGenerate() {
  const resultIterator: Query = query({
    prompt: `read test.md and find out if it contains my name and what it's value is and my current working directory is ${
      import.meta.dirname
    }`,
    options: {
      ...optionsWithCleanEnv,
      model,
    },
  });

  for await (const message of resultIterator) {
    console.log(JSON.stringify(message, null, 2));
    console.log("\n---\n");

    // each message
    switch (message.type) {
      case "assistant":
        for (const content of message.message.content) {
          if (content.type === "text") {
            // console.log(content.text);
          }
        }
        break;
      default:
        break;
    }
  }
}

basicGenerate();
