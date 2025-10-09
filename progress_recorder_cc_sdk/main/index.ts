import readline from "readline";
import { mainAgent } from "./main_agent.js";

let id: string | undefined;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "🙍‍♂️ You: ",
});

rl.prompt();

rl.on("line", async (line) => {
  const trimmedLine = line.trim();
  if (trimmedLine === "exit") {
    rl.close();
    return;
  }

  if (trimmedLine === "reset") {
    id = undefined;
    console.log("Resetting conversation...");
    rl.prompt();
    return;
  }

  const { sessionId } = await mainAgent({
    prompt: trimmedLine,
    id,
  });
  id = sessionId;

  rl.prompt();
});

rl.on("close", () => {
  console.log("Bye!");
  process.exit(0);
});
