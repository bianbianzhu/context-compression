import { Options } from "@anthropic-ai/claude-agent-sdk";

// Clean environment variables to prevent VSCode debugger interference
const cleanEnv = { ...process.env };
delete cleanEnv.NODE_OPTIONS;
delete cleanEnv.VSCODE_INSPECTOR_OPTIONS;

const CWD =
  "/Users/tianyili/Learn/ml/agent-memory/context-compression/progress_recorder_cc_sdk";

export const optionsWithCleanEnv: Options = {
  cwd: CWD,
  permissionMode: "bypassPermissions",
  // Use cleaned environment
  env: cleanEnv,
};
