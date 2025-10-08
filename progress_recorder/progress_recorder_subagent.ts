import "dotenv/config";
import { SubAgent } from "deepagents";
import { language, loadMarkdownFile } from "./utils.js";

const subagentDescription = await loadMarkdownFile(
  language,
  "subagentDescription"
);

const subagentSystemPrompt = await loadMarkdownFile(
  language,
  "subagentSystemPrompt"
);

export const progressRecorderSubagent: SubAgent = {
  name: "progress-recorder",
  description: subagentDescription,
  prompt: subagentSystemPrompt,
};
