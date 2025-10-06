import {
  BaseMessage,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages";
import {
  ChatOpenAI,
  OpenAIChatModelId,
  TiktokenModel,
} from "@langchain/openai";
import { initChatModel } from "langchain/chat_models/universal";
import { countTokens } from "./utils.js";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

import {} from "@langchain/core/";
import { getTokenLimit } from "./tokenLimit.js";

const COMPRESSION_TOKEN_THRESHOLD = 0.7;
const COMPRESSION_PRESERVE_THRESHOLD = 0.3;
const DEFAULT_MODEL: OpenAIChatModelId = "gpt-5";

type CompressionStatus =
  | "COMPRESSED"
  | "COMPRESSION_FAILED_INFLATED_TOKEN_COUNT"
  | "COMPRESSION_FAILED_TOKEN_COUNT_ERROR"
  | "NOOP";

interface ChatCompressionInfo {
  originalTokenCount: number;
  afterCompressionTokenCount: number;
  compressionStatus: CompressionStatus;
}

type CompressChatParams = {
  history: BaseMessage[];
  agentModel: string;
  compressionModel?: string;
};

const configurableLLM = await initChatModel(undefined, {
  temperature: 0,
});

export async function compressChat(
  args: CompressChatParams
): Promise<ChatCompressionInfo> {
  const { history, agentModel, compressionModel = DEFAULT_MODEL } = args;

  // 历史对话为空，不进行压缩
  if (history.length === 0) {
    return {
      originalTokenCount: 0,
      afterCompressionTokenCount: 0,
      compressionStatus: "NOOP",
    };
  }

  // 计算原始token数量
  const originalTokenCount = countTokens(history, agentModel);

  // 计算上下文窗口阈值
  const tokenLimit = COMPRESSION_TOKEN_THRESHOLD * getTokenLimit(agentModel);

  // 原始token数量未达到上下文窗口阈值，不压缩
  if (originalTokenCount < tokenLimit) {
    return {
      originalTokenCount,
      afterCompressionTokenCount: originalTokenCount,
      compressionStatus: "NOOP",
    };
  }

  return {
    originalTokenCount: 0,
    afterCompressionTokenCount: 0,
    compressionStatus: "NOOP",
  };
}

// ================================
// 这个getNumTokens方法有问题，不能用
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
