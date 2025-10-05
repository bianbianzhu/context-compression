import { FunctionDeclaration } from "@google/genai";
import { setLightValuesTool } from "./set_light_values.js";

export const tools: Record<
  string,
  { functionDeclaration: FunctionDeclaration; fn: (...args: any[]) => any }
> = {
  [setLightValuesTool.functionDeclaration.name!]: setLightValuesTool,
};
