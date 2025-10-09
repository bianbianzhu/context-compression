import readline from "readline";
import { optionsWithCleanEnv } from "./utils.js";
import { query, Query } from "@anthropic-ai/claude-agent-sdk";
import { AnthropicMessagesModelId } from "@langchain/anthropic";

let id: string | undefined;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "You: ",
});

rl.prompt();

rl.on("line", async (line) => {
  const trimmedLine = line.trim();
  if (trimmedLine === "exit") {
    rl.close();
    return;
  }

  if (trimmedLine === "reset") {
    id = undefined;
    console.log("Resetting conversation...");
    rl.prompt();
    return;
  }

  const { sessionId } = await conversation({
    prompt: trimmedLine,
    id,
  });
  id = sessionId;

  rl.prompt();
});

rl.on("close", () => {
  console.log("Bye!");
  process.exit(0);
});

type ConversationArgs = {
  prompt: string;
  id?: string;
};

const model: AnthropicMessagesModelId = "claude-3-5-haiku-20241022";

async function conversation(args: ConversationArgs) {
  const { prompt, id } = args;

  let sessionId: string | undefined = id;

  const iterator: Query = query({
    prompt,
    options: {
      ...optionsWithCleanEnv,
      resume: sessionId,
      model,
    },
  });

  for await (const message of iterator) {
    switch (message.type) {
      case "system":
        if (message.subtype === "init") {
          if (!sessionId) {
            sessionId = message.session_id;
          }
        }
        break;

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

  return {
    sessionId,
  };
}
