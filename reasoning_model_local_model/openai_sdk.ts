import { OpenAI } from "openai";

const openai = new OpenAI({
  baseURL: "https://isopolitical-emily-unvaryingly.ngrok-free.dev/v1",
});

const response = await openai.responses.create({
  model: "openai/gpt-oss-20b",
  input: [{ role: "user", content: "write a haiku about space rats" }],
  reasoning: {
    effort: "high",
    summary: "concise",
  },
});

console.log(JSON.stringify(response, null, 2));
