import { BaseClient } from "./context_compression.js";

const client = new BaseClient({
  history: [
    {
      role: "user",
      parts: [{ text: "Turn the lights down to a romantic level" }],
    },
  ],
});

const compressionInfo = await client.tryCompressChat();

console.log("compressionInfo: ", compressionInfo);
