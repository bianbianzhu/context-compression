import "dotenv/config";
import { readFile } from "fs/promises";

type FileType = "memoryRules" | "subagentDescription" | "subagentSystemPrompt";

export type PromptLanguage = "english" | "chinese";

export const language: PromptLanguage = "chinese";

const FILE_PATH: Record<PromptLanguage, Record<FileType, string>> = {
  english: {
    memoryRules: "prompts/project_memory_rules.md",
    subagentDescription: "prompts/subagent_description.md",
    subagentSystemPrompt: "prompts/subagent_system_prompt.md",
  },
  chinese: {
    memoryRules: "prompts/项目记忆规则.md",
    subagentDescription: "prompts/子代理介绍.md",
    subagentSystemPrompt: "prompts/子代理系统提示词.md",
  },
};

export async function loadMarkdownFile(
  language: PromptLanguage = "chinese",
  fileType: FileType
) {
  const filePath = `${import.meta.dirname}/${FILE_PATH[language][fileType]}`;
  try {
    const file = await readFile(filePath, "utf-8");
    return file;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
