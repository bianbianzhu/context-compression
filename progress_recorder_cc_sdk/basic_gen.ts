import "dotenv/config";
import { query, Query } from "@anthropic-ai/claude-agent-sdk";
import { optionsWithCleanEnv } from "./utils.js";

import { AnthropicMessagesModelId } from "@langchain/anthropic";

const model: AnthropicMessagesModelId = "claude-3-5-haiku-latest";

async function basicGenerate() {
  const resultIterator: Query = query({
    prompt: "what is the capital of the moon?",
    options: {
      ...optionsWithCleanEnv,
      model,
    },
  });

  for await (const message of resultIterator) {
    // each message
    switch (message.type) {
      case "assistant":
        for (const content of message.message.content) {
          if (content.type === "text") {
            console.log(content.text);
          }
        }
        break;
      default:
        break;
    }
  }
}

basicGenerate();
