const DEFAULT_TOKEN_LIMIT = 128_000;

/**
 * Returns the token limit for models
 * @param model - The model name
 * @returns The maximum context window size in tokens
 */
export function getTokenLimit(model: string): number {
  switch (model) {
    // ⚪️ OpenAI models
    // GPT-5 models - 400k tokens
    case "gpt-5":
    case "gpt-5-mini":
    case "gpt-5-nano":
      return 400_000;

    // 200k tokens
    case "o4-mini":
    case "o3":
    case "o3-mini":
    case "o1":
      return 200_000;

    // GPT-4.1 models - 1M tokens
    case "gpt-4.1":
    case "gpt-4.1-mini":
    case "gpt-4.1-nano":
      return 1_047_576;

    // GPT-4o models - 128K tokens
    case "gpt-4o":
    case "gpt-4o-2024-08-06":
    case "gpt-4o-2024-05-13":
    case "gpt-4o-mini":
    case "gpt-4o-mini-2024-07-18":
      return 128_000;

    // 🟣 Gemini models
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

    // 🟠 Claude models
    // Claude 4.5 models - 200k tokens (API with no beta header)
    case "claude-sonnet-4-5":
    case "claude-sonnet-4.5":
    case "claude-4.5-sonnet":
    case "claude-sonnet-4-5-20250929":
      return 200_000;

    // Claude 4 models - 200K tokens (500K for enterprise)
    case "claude-4":
    case "claude-4-sonnet":
    case "claude-3-7-sonnet":
    case "claude-sonnet-4":
    case "claude-opus-4-1":
      return 200_000;

    // Claude 3.5 models - 200K tokens
    case "claude-3-5-sonnet":
    case "claude-3-5-sonnet-20241022":
    case "claude-3-5-sonnet-20240620":
    case "claude-3.5-sonnet":
    case "claude-3-5-haiku-20241022":
    case "claude-3.5-haiku":
      return 200_000;

    default:
      return DEFAULT_TOKEN_LIMIT;
  }
}
