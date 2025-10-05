import { FunctionDeclaration, Type } from "@google/genai";

// Define a function that the model can call to control smart lights
const setLightValuesFunctionDeclaration: FunctionDeclaration = {
  name: "set_light_values",
  description: "Sets the brightness and color temperature of a light.",
  parameters: {
    type: Type.OBJECT, // this is not compatible with ajv, so we need to convert it to a compatible schema
    properties: {
      brightness: {
        type: Type.NUMBER,
        description:
          "Light level from 0 to 100. Zero is off and 100 is full brightness",
      },
      color_temp: {
        type: Type.STRING,
        enum: ["daylight", "cool", "warm"],
        description:
          "Color temperature of the light fixture, which can be `daylight`, `cool` or `warm`.",
      },
    },
    required: ["brightness", "color_temp"],
  },
};

/**
 *   Set the brightness and color temperature of a room light. (mock API)
 *   @param {number} args.brightness - Light level from 0 to 100. Zero is off and 100 is full brightness
 *   @param {string} args.color_temp - Color temperature of the light fixture, which can be `daylight`, `cool` or `warm`.
 *   @return {Object} A dictionary containing the set brightness and color temperature.
 */
function setLightValues(args: { brightness: number; color_temp: string }) {
  const { brightness, color_temp } = args;
  return {
    isError: false,
    brightness: brightness,
    colorTemperature: color_temp,
  };
}

export const setLightValuesTool = {
  functionDeclaration: setLightValuesFunctionDeclaration,
  fn: setLightValues,
};
