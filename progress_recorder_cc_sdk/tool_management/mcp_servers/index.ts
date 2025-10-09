import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { getWeather } from "../tools/get_weather.js";
import { getSeason } from "../tools/get_season.js";

export const mcpServer = createSdkMcpServer({
  name: "weather-server",
  version: "1.0.0",
  tools: [getWeather, getSeason],
});
