import {
  GenerateContentParameters,
  GenerateContentResponse,
  GoogleGenAI,
} from "@google/genai";
import { encoding_for_model, TiktokenModel } from "tiktoken";

const MAX_TURNS = 100;

/**
 * Threshold for compression token count as a fraction of the model's token limit.
 * If the chat history exceeds this threshold, it will be compressed.
 * 70% 上下文窗口大小 触发压缩
 */
const COMPRESSION_TOKEN_THRESHOLD = 0.7;

/**
 * The fraction of the latest chat history to keep. A value of 0.3
 * means that only the last 30% of the chat history will be kept after compression.
 * 保留30% 最近对话
 */
const COMPRESSION_PRESERVE_THRESHOLD = 0.3;

const DEFAULT_MODEL = "gemini-2.5-pro";

interface ChatCompressionInfo {
  originalTokenCount: number;
  newTokenCount: number;
  compressionStatus: CompressionStatus;
}

enum CompressionStatus {
  /** The compression was successful */
  COMPRESSED = 1,

  /** The compression failed due to the compression inflating the token count */
  COMPRESSION_FAILED_INFLATED_TOKEN_COUNT,

  /** The compression failed due to an error counting tokens */
  COMPRESSION_FAILED_TOKEN_COUNT_ERROR,

  /** The compression was not necessary and no action was taken */
  NOOP,
}

export class BaseClient {
  /**
   * At any point in this conversation, did compression fail?
   */
  #hasFailedCompressionAttempt: boolean = false;
  #model: string = DEFAULT_MODEL;
  #history: Content[] = [];
  #chat: Content[] = [];

  constructor({ history }: { history: Content[] }) {
    this.#history = history;
  }

  /**
   * Returns the chat history.
   *
   * @remarks
   * The history is a list of contents alternating between user and model.
   *
   * There are two types of history:
   * - The `curated history` contains only the valid turns between user and
   * model, which will be included in the subsequent requests sent to the model.
   * - The `comprehensive history` contains all turns, including invalid or
   * empty model outputs, providing a complete record of the history.
   *
   * The history is updated after receiving the response from the model,
   * for streaming response, it means receiving the last chunk of the response.
   *
   * The `comprehensive history` is returned by default. To get the `curated
   * history`, set the `curated` parameter to `true`.
   *
   * @param curated - whether to return the curated history or the comprehensive
   * history.
   * @return History contents alternating between user and model for the entire
   * chat session.
   */
  getHistory(curated: boolean = false): Content[] {
    const history = curated
      ? extractCuratedHistory(this.#history)
      : this.#history;
    // Deep copy the history to avoid mutating the history outside of the
    // chat session.
    return structuredClone(history);
  }

  async tryCompressChat(): Promise<ChatCompressionInfo> {
    // 拿到历史对话
    const curatedHistory = this.getHistory(true);

    // don't do anything if the history is empty.
    // 如果历史对话为空 则不进行压缩
    if (curatedHistory.length === 0) {
      return {
        originalTokenCount: 0,
        newTokenCount: 0,
        compressionStatus: CompressionStatus.NOOP,
      };
    }

    const originalTokenCount = countTokens(curatedHistory, "gpt-4o");

    // don't compress if we are under the limit.
    const threshold = COMPRESSION_TOKEN_THRESHOLD;
    if (originalTokenCount < threshold * tokenLimitTest(this.#model)) {
      return {
        originalTokenCount,
        newTokenCount: originalTokenCount,
        compressionStatus: CompressionStatus.NOOP,
      };
    }

    const splitPoint = findCompressSplitPoint(
      curatedHistory,
      1 - COMPRESSION_PRESERVE_THRESHOLD
    );

    const historyToCompress = curatedHistory.slice(0, splitPoint);
    const historyToKeep = curatedHistory.slice(splitPoint);

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const params: GenerateContentParameters = {
      model: this.#model,
      contents: [
        ...historyToCompress,
        {
          role: "user",
          parts: [
            {
              text: "First, reason in your scratchpad. Then, generate the <state_snapshot>.",
            },
          ],
        },
      ],
      config: {
        systemInstruction: { text: getCompressionPrompt() },
      },
    };

    const summaryResponse = await ai.models.generateContent(params);

    const summary = getResponseText(summaryResponse) ?? "";

    const chat: Content[] = [
      {
        role: "user",
        parts: [{ text: summary }],
      },
      {
        role: "model",
        parts: [{ text: "Got it. Thanks for the additional context!" }],
      },
      ...historyToKeep,
    ];

    // Estimate token count 1 token ≈ 4 characters
    const newTokenCount = Math.floor(
      chat.reduce(
        (total, content) => total + JSON.stringify(content).length,
        0
      ) / 4
    );

    const tiktokenNewTokenCount = countTokens(chat, "gpt-4o");
    console.log("tiktokenNewTokenCount: ", tiktokenNewTokenCount);

    console.log({
      tokens_before: originalTokenCount,
      tokens_after: newTokenCount,
    });

    if (newTokenCount > originalTokenCount) {
      this.#hasFailedCompressionAttempt = true;
      console.log(
        "hasFailedCompressionAttempt: ",
        this.#hasFailedCompressionAttempt
      );
      return {
        originalTokenCount,
        newTokenCount,
        compressionStatus:
          CompressionStatus.COMPRESSION_FAILED_INFLATED_TOKEN_COUNT,
      };
    } else {
      this.#chat = chat; // Chat compression successful, set new state.
      console.log("chat: ", JSON.stringify(this.#chat, null, 2));
    }

    return {
      originalTokenCount,
      newTokenCount,
      compressionStatus: CompressionStatus.COMPRESSED,
    };
  }
}

const DEFAULT_TOKEN_LIMIT = 1_048_576;

function tokenLimit(model: string): number {
  switch (model) {
    case "gemini-1.5-pro":
      return 2_097_152;
    case "gemini-1.5-flash":
    case "gemini-2.5-pro-preview-05-06":
    case "gemini-2.5-pro-preview-06-05":
    case "gemini-2.5-pro":
    case "gemini-2.5-flash-preview-05-20":
    case "gemini-2.5-flash":
    case "gemini-2.5-flash-lite":
    case "gemini-2.0-flash":
      return 1_048_576;
    case "gemini-2.0-flash-preview-image-generation":
      return 32_000;
    default:
      return DEFAULT_TOKEN_LIMIT;
  }
}

function tokenLimitTest(model: string): number {
  switch (model) {
    case "gemini-1.5-pro":
      return 128;
    case "gemini-1.5-flash":
    case "gemini-2.5-pro-preview-05-06":
    case "gemini-2.5-pro-preview-06-05":
    case "gemini-2.5-pro":
    case "gemini-2.5-flash-preview-05-20":
    case "gemini-2.5-flash":
    case "gemini-2.5-flash-lite":
    case "gemini-2.0-flash":
      return 512;
    case "gemini-2.0-flash-preview-image-generation":
      return 128;
    default:
      return DEFAULT_TOKEN_LIMIT;
  }
}

/** A datatype containing media content.
 Exactly one field within a Part should be set, representing the specific type
 of content being conveyed. Using multiple fields within the same `Part`
 instance is considered invalid.
 */
export declare interface Part {
  /** Metadata for a given video. */
  videoMetadata?: any;
  /** Indicates if the part is thought from the model. */
  thought?: boolean;
  /** Optional. Inlined bytes data. */
  inlineData?: any;
  /** Optional. URI based data. */
  fileData?: any;
  /** An opaque signature for the thought so it can be reused in subsequent requests.
   * @remarks Encoded as base64 string. */
  thoughtSignature?: string;
  /** Optional. Result of executing the [ExecutableCode]. */
  codeExecutionResult?: any;
  /** Optional. Code generated by the model that is meant to be executed. */
  executableCode?: any;
  /** Optional. A predicted [FunctionCall] returned from the model that contains a string representing the [FunctionDeclaration.name] with the parameters and their values. */
  functionCall?: any;
  /** Optional. The result output of a [FunctionCall] that contains a string representing the [FunctionDeclaration.name] and a structured JSON object containing any output from the function call. It is used as context to the model. */
  functionResponse?: any;
  /** Optional. Text part (can be code). */
  text?: string;
}

/** Contains the multi-part content of a message. */
export declare interface Content {
  /** List of parts that constitute a single message. Each part may have
     a different IANA MIME type. */
  parts?: Part[];
  /** Optional. The producer of the content. Must be either 'user' or
     'model'. Useful to set for multi-turn conversations, otherwise can be
     empty. If role is not specified, SDK will determine the role. */
  role?: string;
}

/**
 * Returns the index of the oldest item to keep when compressing. May return
 * contents.length which indicates that everything should be compressed.
 */
function findCompressSplitPoint(contents: Content[], fraction: number): number {
  // 步骤0: 校验参数 - fraction 为压缩比例（1 - 保留比例）
  if (fraction <= 0 || fraction >= 1) {
    throw new Error("Fraction must be between 0 and 1");
  }

  // 步骤1: 先按条目 JSON 字符长度估算体积，计算总字符数与目标压缩体积 total * fraction
  // 1.1 计算每个内容的长度
  const charCounts = contents.map((content) => JSON.stringify(content).length);
  // 1.2 计算总字符数
  const totalCharCount = charCounts.reduce((a, b) => a + b, 0);
  // 1.3 计算需要压缩的内容长度
  const targetCharCount = totalCharCount * fraction; // 0.7

  let lastSplitPoint = 0; // 0 is always valid (compress nothing)
  let cumulativeCharCount = 0; // 累计字符数
  // 步骤2: 仅把“用户消息且不包含 functionResponse 的条目”视为安全分割点；沿着历史从头累加字符数，超过目标后在最近的安全分割点切分。
  for (let i = 0; i < contents.length; i++) {
    const content = contents[i];
    // 2.1 如果内容为用户消息且不包含 functionResponse，则视为安全分割点
    // Gemini当中，function result 就是一个用户消息with functionResponse
    if (
      content.role === "user" &&
      !content.parts?.some((part) => !!part.functionResponse)
    ) {
      // 2.1.1 如果累计长度大于等于需要压缩的内容长度，则返回当前索引
      // 该累计长度是上一轮（即当前这个安全分割点之前的所有内容：可压缩节）的字符数总和
      if (cumulativeCharCount >= targetCharCount) {
        return i;
      }
      // 2.1.2 更新最近的安全分割点
      lastSplitPoint = i;
    }
    // 2.2 按条目累加字符数
    cumulativeCharCount += charCounts[i];
  }

  // We found no split points after targetCharCount.
  // Check if it's safe to compress everything.
  // 步骤3: 若遍历后仍未找到合适分割点且最后一条是“模型消息且不含 functionCall”，则可以返回 contents.length（全压缩安全）。
  const lastContent = contents[contents.length - 1];

  if (
    lastContent?.role === "model" &&
    !lastContent?.parts?.some((part) => part.functionCall)
  ) {
    return contents.length;
  }

  // 步骤4: 否则退而求其次，返回遍历中记录的最后一个安全分割点。
  // Can't compress everything so just compress at last splitpoint.
  return lastSplitPoint;
}

/**
 * Provides the system prompt for the history compression process.
 * This prompt instructs the model to act as a specialized state manager,
 * think in a scratchpad, and produce a structured XML summary.
 */
function getCompressionPrompt(): string {
  return `
  You are the component that summarizes internal chat history into a given structure.
  
  When the conversation history grows too large, you will be invoked to distill the entire history into a concise, structured XML snapshot. This snapshot is CRITICAL, as it will become the agent's *only* memory of the past. The agent will resume its work based solely on this snapshot. All crucial details, plans, errors, and user directives MUST be preserved.
  
  First, you will think through the entire history in a private <scratchpad>. Review the user's overall goal, the agent's actions, tool outputs, file modifications, and any unresolved questions. Identify every piece of information that is essential for future actions.
  
  After your reasoning is complete, generate the final <state_snapshot> XML object. Be incredibly dense with information. Omit any irrelevant conversational filler.
  
  The structure MUST be as follows:
  
  <state_snapshot>
      <overall_goal>
          <!-- A single, concise sentence describing the user's high-level objective. -->
          <!-- Example: "Refactor the authentication service to use a new JWT library." -->
      </overall_goal>
  
      <key_knowledge>
          <!-- Crucial facts, conventions, and constraints the agent must remember based on the conversation history and interaction with the user. Use bullet points. -->
          <!-- Example:
           - Build Command: \`npm run build\`
           - Testing: Tests are run with \`npm test\`. Test files must end in \`.test.ts\`.
           - API Endpoint: The primary API endpoint is \`https://api.example.com/v2\`.
           
          -->
      </key_knowledge>
  
      <file_system_state>
          <!-- List files that have been created, read, modified, or deleted. Note their status and critical learnings. -->
          <!-- Example:
           - CWD: \`/home/user/project/src\`
           - READ: \`package.json\` - Confirmed 'axios' is a dependency.
           - MODIFIED: \`services/auth.ts\` - Replaced 'jsonwebtoken' with 'jose'.
           - CREATED: \`tests/new-feature.test.ts\` - Initial test structure for the new feature.
          -->
      </file_system_state>
  
      <recent_actions>
          <!-- A summary of the last few significant agent actions and their outcomes. Focus on facts. -->
          <!-- Example:
           - Ran \`grep 'old_function'\` which returned 3 results in 2 files.
           - Ran \`npm run test\`, which failed due to a snapshot mismatch in \`UserProfile.test.ts\`.
           - Ran \`ls -F static/\` and discovered image assets are stored as \`.webp\`.
          -->
      </recent_actions>
  
      <current_plan>
          <!-- The agent's step-by-step plan. Mark completed steps. -->
          <!-- Example:
           1. [DONE] Identify all files using the deprecated 'UserAPI'.
           2. [IN PROGRESS] Refactor \`src/components/UserProfile.tsx\` to use the new 'ProfileAPI'.
           3. [TODO] Refactor the remaining files.
           4. [TODO] Update tests to reflect the API change.
          -->
      </current_plan>
  </state_snapshot>
  `.trim();
}

// 获取响应文本
function getResponseText(response: GenerateContentResponse): string | null {
  if (response.candidates && response.candidates.length > 0) {
    const candidate = response.candidates[0];

    if (
      candidate.content &&
      candidate.content.parts &&
      candidate.content.parts.length > 0
    ) {
      return candidate.content.parts
        .filter((part) => part.text)
        .map((part) => part.text)
        .join("");
    }
  }
  return null;
}

/**
 * Extracts the curated (valid) history from a comprehensive history.
 *
 * @remarks
 * The model may sometimes generate invalid or empty contents(e.g., due to safety
 * filters or recitation). Extracting valid turns from the history
 * ensures that subsequent requests could be accepted by the model.
 */
function extractCuratedHistory(comprehensiveHistory: Content[]): Content[] {
  if (comprehensiveHistory === undefined || comprehensiveHistory.length === 0) {
    return [];
  }
  const curatedHistory: Content[] = [];
  const length = comprehensiveHistory.length;
  let i = 0;
  while (i < length) {
    if (comprehensiveHistory[i].role === "user") {
      curatedHistory.push(comprehensiveHistory[i]);
      i++;
    } else {
      const modelOutput: Content[] = [];
      let isValid = true;
      while (i < length && comprehensiveHistory[i].role === "model") {
        modelOutput.push(comprehensiveHistory[i]);
        if (isValid && !isValidContent(comprehensiveHistory[i])) {
          isValid = false;
        }
        i++;
      }
      if (isValid) {
        curatedHistory.push(...modelOutput);
      }
    }
  }
  return curatedHistory;
}

function isValidContent(content: Content): boolean {
  if (content.parts === undefined || content.parts.length === 0) {
    return false;
  }
  for (const part of content.parts) {
    if (part === undefined || Object.keys(part).length === 0) {
      return false;
    }
    if (!part.thought && part.text !== undefined && part.text === "") {
      return false;
    }
  }
  return true;
}

function countTokens(contents: Content[], model: TiktokenModel): number {
  try {
    const enc = encoding_for_model(model);
    const tokens = enc.encode(JSON.stringify(contents));
    enc.free();
    return tokens.length;
  } catch (error) {
    console.error("Error counting tokens:", error);
    throw error;
  }
}
