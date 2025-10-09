import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "You: ",
});

rl.prompt();

rl.on("line", async (line) => {
  const trimmedLine = line.trim();
  if (trimmedLine === "exit") {
    rl.close();
    return;
  }

  console.log(trimmedLine);

  rl.prompt();
});

rl.on("close", () => {
  console.log("Bye!");
  process.exit(0);
});
