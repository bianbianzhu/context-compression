import "dotenv/config";
import { createDeepAgent } from "deepagents";
import { language, loadMarkdownFile } from "./utils.js";
import { progressRecorderSubagent } from "./progress_recorder_subagent.js";
import { initChatModel } from "langchain/chat_models/universal";
import { AnthropicMessagesModelId } from "@langchain/anthropic";

const instructions = await loadMarkdownFile(language, "memoryRules");

const llm = await initChatModel(
  "claude-sonnet-4-5" satisfies AnthropicMessagesModelId,
  {
    temperature: 0,
  }
);

export const mainAgent = createDeepAgent({
  instructions,
  model: llm,
  builtinTools: ["ls", "edit_file", "write_file", "read_file"],
  subagents: [progressRecorderSubagent],
}).withConfig({ recursionLimit: 100 });

export { language };
// async function main() {
//   const result = await mainAgent.invoke({
//     messages: [
//       {
//         role: "user",
//         content:
//           "help me build a landing page and a dashboard and cart page for my company. It's a pet shop. Use modern design and tech stack. do both frontend and backend.",
//       },
//     ],
//   });
//   console.log(result);
// }

// main();
