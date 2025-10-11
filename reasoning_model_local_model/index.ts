import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const customModel = new ChatOpenAI({
  configuration: {
    baseURL: "https://isopolitical-emily-unvaryingly.ngrok-free.dev/v1", // must include /v1; otherwise, TypeError: data.choices is not iterable (cannot read property undefined)
  },
  model: "openai/gpt-oss-20b",
  reasoning: {
    effort: "high",
    summary: "detailed",
  },
});

const model = new ChatOpenAI({
  model: "o3-mini",
  reasoning: {
    effort: "low",
    summary: "detailed",
  },
});

const getWeather = tool(() => "weather ok", {
  name: "get_weather",
  description:
    "Get the weather. If no city is provided, give null (not string, but null)",
  schema: z.object({
    city: z.string().describe("The city to get the weather for"),
  }),
});

const modelWithTools = customModel.bindTools([getWeather]);

// start time
const startTime = Date.now();
const response = await modelWithTools.invoke(
  "write an article about how to become a pokemon"
);
const endTime = Date.now();
const durationSeconds = (endTime - startTime) / 1000;

console.log(JSON.stringify(response, null, 2));
console.log("-----");
console.log(`⏰ Time taken: ${durationSeconds}s`);
