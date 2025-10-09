import readline from "readline";
import { optionsWithCleanEnv } from "./utils.js";
import { query, Query } from "@anthropic-ai/claude-agent-sdk";
import { AnthropicMessagesModelId } from "@langchain/anthropic";
import { mcpServer } from "./tool_management/mcp_servers/index.js";

let id: string | undefined;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "🙍‍♂️ You: ",
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
      // mpcServers is a map of server names to server instances
      mcpServers: {
        ["weather_server"]: mcpServer,
      },
      // following naming pattern: mcp__{server_name}__{tool_name}
      // server_name is the one in the above mcpServers map (not the one in the createSdkMcpServer)
      // disallowedTools: ["mcp__weather_server__get_season"],
    },
  });

  for await (const message of iterator) {
    console.log(JSON.stringify(message, null, 2));
    console.log("\n---\n");

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
            console.log("🤖 Agent: " + content.text);
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
