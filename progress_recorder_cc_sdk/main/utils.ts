import "dotenv/config";
import { readFile } from "fs/promises";

type FileType = "memoryRules" | "subagentDescription" | "subagentSystemPrompt";

const FILE_PATH: Record<FileType, string> = {
  memoryRules: "项目记忆规则.md",
  subagentDescription: "子代理介绍.md",
  subagentSystemPrompt: "子代理系统提示词.md",
};

export async function loadMarkdownFile(fileType: FileType) {
  const filePath = `${import.meta.dirname}/prompts/${FILE_PATH[fileType]}`;
  try {
    const file = await readFile(filePath, "utf-8");
    return file;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
