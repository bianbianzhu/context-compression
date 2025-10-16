import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { OpenAIChatModelId } from "@langchain/openai";
import { initChatModel } from "langchain/chat_models/universal";
import { countTokens, getCuratedMessages } from "./utils.js";

import {} from "@langchain/core/";
import { getTokenLimit } from "./tokenLimit.js";
import { findCompressSplitPoint } from "./findCompressSplitPoint.js";
import { getCompressionPrompt } from "./compress_prompt.js";

const COMPRESSION_TOKEN_THRESHOLD = 0.7;
const COMPRESSION_PRESERVE_THRESHOLD = 0.3;
// const DEFAULT_MODEL: OpenAIChatModelId = "gpt-4.1";
const DEFAULT_MODEL_INFO = {
  model: "gemini-2.5-pro",
  modelProvider: "google-genai",
};

type CompressionStatus =
  | "COMPRESSED"
  | "COMPRESSION_FAILED_INFLATED_TOKEN_COUNT"
  | "COMPRESSION_FAILED_TOKEN_COUNT_ERROR"
  | "NOOP";

interface ChatCompressionInfo {
  originalTokenCount: number;
  afterCompressionTokenCount: number;
  compressionStatus: CompressionStatus;
  updatedMessages: BaseMessage[];
}

type CompressChatParams = {
  messages: BaseMessage[];
  chatModel: string;
  compressionModelInfo?: {
    model: string;
    modelProvider: string;
  };
};

const configurableLLM = await initChatModel(undefined);

export async function compressChat(
  args: CompressChatParams
): Promise<ChatCompressionInfo> {
  const {
    messages,
    chatModel,
    compressionModelInfo = DEFAULT_MODEL_INFO,
  } = args;

  const { curatedMessages, systemMessage } = getCuratedMessages(messages);

  // 历史对话为空，不进行压缩
  if (curatedMessages.length === 0) {
    return {
      originalTokenCount: 0,
      afterCompressionTokenCount: 0,
      compressionStatus: "NOOP",
      updatedMessages: messages,
    };
  }

  // 计算原始token数量
  // 这得包括system message的token数量， 但之后不压缩系统提示词
  const originalTokenCount = countTokens(messages, chatModel);

  // 计算上下文窗口阈值
  const tokenLimit = COMPRESSION_TOKEN_THRESHOLD * getTokenLimit(chatModel);

  // 原始token数量未达到上下文窗口阈值，不压缩
  if (originalTokenCount < tokenLimit) {
    return {
      originalTokenCount,
      afterCompressionTokenCount: originalTokenCount,
      compressionStatus: "NOOP",
      updatedMessages: messages,
    };
  }

  // 找到压缩的分割点
  const splitPoint = findCompressSplitPoint(
    curatedMessages,
    1 - COMPRESSION_PRESERVE_THRESHOLD
  );

  const messagesToCompress = curatedMessages.slice(0, splitPoint);
  const messagesToKeep = curatedMessages.slice(splitPoint);

  if (messagesToCompress.length === 0) {
    return {
      originalTokenCount,
      afterCompressionTokenCount: originalTokenCount,
      compressionStatus: "NOOP",
      updatedMessages: messages,
    };
  }

  const compressPromptMessages: BaseMessage[] = [
    new SystemMessage(getCompressionPrompt()),
    ...messagesToCompress,
    new HumanMessage(
      "First, reason in your scratchpad. Then, generate the <state_snapshot>."
    ),
  ];

  const summaryResponse = await configurableLLM.invoke(compressPromptMessages, {
    configurable: {
      ...compressionModelInfo,
    },
  });

  const updatedMessages: BaseMessage[] = [
    new HumanMessage({ content: summaryResponse.content }),
    new AIMessage("Got it. Thanks for the additional context!"),
    ...messagesToKeep,
  ];

  if (systemMessage) {
    updatedMessages.unshift(systemMessage);
  }

  const afterCompressionTokenCount = countTokens(updatedMessages, chatModel);

  if (afterCompressionTokenCount > originalTokenCount) {
    return {
      originalTokenCount,
      afterCompressionTokenCount,
      compressionStatus: "COMPRESSION_FAILED_INFLATED_TOKEN_COUNT",
      updatedMessages,
    };
  }

  return {
    originalTokenCount,
    afterCompressionTokenCount,
    compressionStatus: "COMPRESSED",
    updatedMessages,
  };
}

// ================================
// langchain的这个getNumTokens方法有问题，不能用
// 源代码中，如果参数不是string，那么直接返回0
// 也没有帮我们清理langchain message内部带有的多余信息
// console.log(
//   await configurableLLM.getNumTokens(
//     messages.map((message) => message.content as string).join("\n")
//   )
// );
// 还是决定用tiktoken来计算token数量
// 虽然不会清理langchain message内部带有的多余信息， 但是直接传入BaseMessage[], 然后stringify之后，计算token数量。
// 其实我们对真正的token数量不会敏感：
// 1. token数量用户计算，要不要压缩，即是否达到window size阈值，哪怕多算了，最多就是早点压缩，不会晚压缩。安全
// 2. 用于计算在哪一个message切分，这时候，我们用的字符数，而不是token数量。
