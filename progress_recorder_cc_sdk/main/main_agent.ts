import { Query, query } from "@anthropic-ai/claude-agent-sdk";
import { loadMarkdownFile } from "./utils.js";
import { AnthropicMessagesModelId } from "@langchain/anthropic";
import { optionsWithCleanEnv } from "../utils.js";
import { agents } from "./subagent.js";

const model: AnthropicMessagesModelId = "claude-sonnet-4-5";

type ConversationArgs = {
  prompt: string;
  id?: string;
};

export async function mainAgent(args: ConversationArgs): Promise<{
  sessionId: string | undefined;
}> {
  const { prompt, id } = args;

  let session: string | undefined = id;

  const memoryRules = await loadMarkdownFile("memoryRules");

  const iterator: Query = query({
    prompt,
    options: {
      ...optionsWithCleanEnv,
      resume: session,
      model,
      systemPrompt: {
        type: "preset",
        preset: "claude_code",
        append: memoryRules,
      },
      agents,
    },
  });

  for await (const message of iterator) {
    console.log(JSON.stringify(message, null, 2));
    console.log("\n---\n");

    switch (message.type) {
      case "system":
        if (message.subtype === "init" && !session) {
          session = message.session_id;
        }
        break;

      case "assistant":
        for (const content of message.message.content) {
          if (content.type === "text") {
            console.log("🤖 Agent: " + content.text);
          }
        }
        break;

      default:
        break;
    }
  }

  return {
    sessionId: session,
  };
}
