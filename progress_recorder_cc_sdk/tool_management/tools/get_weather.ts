import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { ContentResult } from "./type.js";

const openweatherApiKey = process.env.OPENWEATHER_API_KEY ?? "";

export const getWeather = tool(
  "get_weather",
  "Get weather information for a specific city. The input is the city name. The output is the weather information for the city.",
  {
    city: z.string().describe("The city name to get weather information for"),
  },
  async ({ city }): Promise<ContentResult> => {
    const encodedCity = encodeURIComponent(city);
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodedCity}&appid=${openweatherApiKey}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.text();

      return {
        content: [
          {
            type: "text",
            text: data,
          },
        ],
        isError: false,
      };
    } catch (error) {
      throw new Error(`Error fetching weather data: ${error}`);
    }
  }
);
