import { Query, query } from "@anthropic-ai/claude-agent-sdk";
import { AnthropicMessagesModelId } from "@langchain/anthropic";
import { optionsWithCleanEnv } from "./utils.js";

const model: AnthropicMessagesModelId = "claude-3-5-haiku-latest";

type ConversationContextGenerationArgs = {
  prompt: string;
  id?: string;
};

export async function conversationContextGeneration(
  args: ConversationContextGenerationArgs
) {
  const { prompt, id } = args;
  // session ID to track the current conversation
  let sessionId: string | undefined = id;

  const iterator: Query = query({
    prompt,
    options: {
      ...optionsWithCleanEnv,
      // pass in the session id (can be undefined)
      resume: sessionId,
      model,
    },
  });

  // handle the messages as they come in
  for await (const message of iterator) {
    // each message has an object - with a field "type"
    // use "type" to check what kind of message it is

    console.log(JSON.stringify(message, null, 2));
    console.log("\n---\n");

    switch (message.type) {
      case "system":
        if (message.subtype === "init") {
          // check if we are initiating a new conversation (new session)
          if (!sessionId) {
            sessionId = message.session_id; // save new conversation session ID
          }
        }
        break;

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

  return {
    sessionId,
  };
}

const { sessionId } = await conversationContextGeneration({
  prompt: `Read test.md and find out what's in it my current working directory is ${
    import.meta.dirname
  }`,
});

await conversationContextGeneration({
  prompt: "what was in the file?",
  id: sessionId,
});
