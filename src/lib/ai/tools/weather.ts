import * as z from "zod";
import { tool } from "langchain";

/**
 * Weather tool - Get weather information for a city
 * This is an example tool that can be extended or replaced
 */
export const weatherTool = tool(
  ({ city }: { city: string }) => {
    // This is a mock implementation
    // In production, you would call a real weather API
    return `It's always sunny in ${city}!`;
  },
  {
    name: "get_weather",
    description: "Get the weather for a given city",
    schema: z.object({
      city: z.string().describe("The city name to get weather for"),
    }),
  }
);
