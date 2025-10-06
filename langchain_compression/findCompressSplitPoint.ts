import { BaseMessage, HumanMessage } from "@langchain/core/messages";

function findCompressSplitPoint(
  messages: BaseMessage[],
  fraction: number
): number {
  // 校验参数 - fraction 为压缩比例（1 - 保留比例）
  if (fraction <= 0 || fraction >= 1) {
    throw new Error("Fraction must be between 0 and 1");
  }

  // 计算每个消息的长度
  const charCounts = messages.map((message) => JSON.stringify(message).length);

  // 计算总长度
  const totalCharCount = charCounts.reduce((a, b) => a + b, 0);

  // 计算目标压缩长度（理想化最小压缩长度）
  const targetCharCount = totalCharCount * fraction;

  let lastSplitPoint = 0;
  let cumulativeCharCount = 0;

  for (let i = 0; i < history.length; i++) {
    if (messages[i] instanceof HumanMessage) {
    }
  }

  return 0;
}
