import "dotenv/config";

import {
  BaseMessage,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { initChatModel } from "langchain/chat_models/universal";
import { z } from "zod";
import type { OpenAIChatModelId } from "@langchain/openai";
import type { AnthropicMessagesModelId } from "@langchain/anthropic";

// const model: AnthropicMessagesModelId = "claude-sonnet-4-5";

// const model: OpenAIChatModelId = "gpt-4o";

// no export model id for google-genai
const model = "gemini-2.5-flash";

const configurableLLM = await initChatModel(undefined, {
  temperature: 0,
});

const messages: BaseMessage[] = [
  new HumanMessage("what is the capital of the moon?"),
];

const moonFaq = tool(
  async (args) => {
    const { question } = args;
    return `The answer to ${question} is that the moon is a big ball of cheese. The capital of the moon is cheesy city.`;
  },
  {
    name: "moon_faq",
    description: "answer any question about the moon",
    schema: z.object({
      question: z.string().describe("the question from the user"),
    }),
  }
);

const result = await configurableLLM.bindTools([moonFaq]).invoke(messages, {
  configurable: { model: "gpt-4o" },
});

messages.push(result);

const finishReason = result.response_metadata.finish_reason;

const stopReason = result.response_metadata.stop_reason;

const invalidFinishReason = result.response_metadata.finishReason;
// openai - response_metadata.finish_reason === "tool_calls"
// anthropic - response_metadata.stop_reason === "tool_use"
// google-genai - response_metadata.finishReason === "STOP" (didn't show tool call info)
if (result.tool_calls?.length) {
  const toolCall = result.tool_calls[0];

  if (toolCall?.name === moonFaq.name) {
    const toolCallResult = await moonFaq.invoke({
      question: toolCall?.args.question,
    });

    const toolMessage = new ToolMessage({
      content: toolCallResult,
      tool_call_id: toolCall.id!,
    });

    messages.push(toolMessage);
  }
}

const result2 = await configurableLLM.bindTools([moonFaq]).invoke(messages, {
  configurable: { model, modelProvider: "google-genai" },
});

messages.push(result2);

console.log(messages);
