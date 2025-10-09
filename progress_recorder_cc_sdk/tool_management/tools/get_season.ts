import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { ContentResult } from "./type.js";

export const getSeason = tool(
  "get_season",
  "Get the season for a given city",
  {
    city: z.string().describe("The city to get the season for"),
  },
  async ({ city }): Promise<ContentResult> => {
    const currentDate = new Date();

    const isMelbourne = city.trim().toLowerCase() === "melbourne";

    const month = currentDate.getMonth();
    let season = "";
    if (month >= 2 && month <= 4) {
      season = isMelbourne ? "Autumn" : "spring";
    } else if (month >= 5 && month <= 7) {
      season = isMelbourne ? "Winter" : "summer";
    } else if (month >= 8 && month <= 10) {
      season = isMelbourne ? "Spring" : "autumn";
    } else {
      season = isMelbourne ? "Summer" : "winter";
    }

    return {
      content: [
        {
          type: "text",
          text: `The season for the city ${city} is ${season}`,
        },
      ],
      isError: false,
    };
  }
);
