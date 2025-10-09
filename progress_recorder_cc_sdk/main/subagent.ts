import { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { loadMarkdownFile } from "./utils.js";

const description = await loadMarkdownFile("subagentDescription");
const prompt = await loadMarkdownFile("subagentSystemPrompt");

const progressRecorder: AgentDefinition = {
  description,
  prompt,
  //   tools: [
  //     "Bash",
  //     "Glob",
  //     "Grep",
  //     "Read",
  //     "Edit",
  //     "Write",
  //     "TodoWrite",
  //     "SlashCommand",
  //   ],
};

export const agents = {
  ["progress-recorder"]: progressRecorder,
} as const;
