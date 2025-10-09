import { Query, query } from "@anthropic-ai/claude-agent-sdk";

export async function conversationContextGeneration() {
  // session ID to track the current conversation
  let sessionId: string | undefined;

  const iterator: Query = query({
    prompt: "Tell me a joke",
    options: {
      // pass in the session id
      resume: sessionId,
    },
  });

  // handle the messages as they come in
  for await (const message of iterator) {
    // each message has an object - with a field "type"
    // use "type" to check what kind of message it is

    switch (message.type) {
      case "system":
        if (message.subtype === "init") {
          // check if we are initiating a new conversation (new session)
          sessionId = message.session_id; // save new conversation session ID
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
}
