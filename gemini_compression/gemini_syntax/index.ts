import "dotenv/config";

import {
  Content,
  FunctionResponse,
  GenerateContentConfig,
  GoogleGenAI,
  Schema,
} from "@google/genai";
import { Ajv, AnySchema, ErrorObject } from "ajv";
import { setLightValuesFunctionDeclaration } from "./tools/set_light_values.js";

// Define the function declarations (tools list)
const functionDeclarations = [setLightValuesFunctionDeclaration];

// Generation config with function declaration
const config: GenerateContentConfig = {
  tools: [
    {
      functionDeclarations,
    },
  ],
};

// Configure the client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Define user prompt
const contents: Content[] = [
  {
    role: "user",
    parts: [{ text: "Turn the lights down to a romantic level" }],
  },
];

// Send request with function declarations
// response data structure - refer to gemini_compression/gemini_syntax/data_structure/ai_message_with_function_call.json
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents,
  config,
});

const lastContent = response.candidates?.[0]?.content;

if (!lastContent) {
  throw new Error("No last content found");
}

contents.push(lastContent);

console.log("The function call is: ", response.functionCalls?.[0]);

const { functionCalls } = response;

if (functionCalls?.length) {
  for (const functionCall of functionCalls) {
    const { name: functionName, args: functionArgs } = functionCall;

    if (!functionName) {
      throw new Error("LLM did not provide a function name for function call");
    }

    if (functionName === setLightValuesFunctionDeclaration.name) {
      if (!setLightValuesFunctionDeclaration.parameters) {
        throw new Error("Function declaration parameters are required");
      }

      const [errors, value] = isArgsValid<{
        brightness: number;
        color_temp: "daylight" | "cool" | "warm";
      }>({
        args: functionArgs,
        schema: setLightValuesFunctionDeclaration.parameters,
      });

      if (errors) {
        throw new Error(
          `Invalid function call arguments: ${errors
            .map((error) => error.message)
            .join(", ")}`
        );
      }

      const result = setLightValues(value.brightness, value.color_temp);

      const functionResponse: FunctionResponse = {
        // must be the same as the function call name from the model's function call
        name: functionName,
        // must be an object
        response: { result },
      };

      // append the result of the function call to the contents
      contents.push({
        // role must be "user"
        role: "user",
        parts: [
          {
            functionResponse,
          },
        ],
      });
    }
  }
}

//
const response2 = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: contents,
  config: config,
});

contents.push(response2.candidates?.[0]?.content!);

console.log("contents: ", JSON.stringify(contents, null, 2));

/**
 * @param {unknown} args - The arguments to validate
 * @param {Schema} schema - The schema to validate the arguments against. Schema Must only contain `type`, `properties`, `required` and `additionalProperties` fields.
 */
function isArgsValid<T>({
  args,
  schema,
}: {
  args: unknown;
  schema: Schema;
}): [null, T] | [ErrorObject[], null] {
  const ajv = new Ajv();

  const validate = ajv.compile(formatGeminiSchemaToAjvSchema(schema));

  const isValid = validate(args);

  if (!isValid) {
    return [validate.errors ?? [], null];
  }

  return [null, args as T];
}

/**
 * Format the gemini schema to the ajv schema:
 * 1. convert the `type` field from Type to lowercase string `number`, `string`, `boolean`, `object`, `array` etc.
 * Must only pass the parameters field from the gemini FunctionDeclaration schema
 */
function formatGeminiSchemaToAjvSchema(schema: Schema): AnySchema {
  const { properties, required } = schema;

  if (!properties) {
    throw new Error("Properties are required");
  }

  // find every single `type` field and convert it to lowercase string `number`, `string`, `boolean`, `object`, `array` etc.
  const formattedProperties: Record<string, any> = {};
  for (const [key, value] of Object.entries(properties)) {
    formattedProperties[key] = {
      ...value,
      type: value.type?.toLowerCase(),
    };
  }

  return {
    type: "object",
    properties: formattedProperties,
    required,
  };
}

/**
 *   Set the brightness and color temperature of a room light. (mock API)
 *   @param {number} brightness - Light level from 0 to 100. Zero is off and 100 is full brightness
 *   @param {string} color_temp - Color temperature of the light fixture, which can be `daylight`, `cool` or `warm`.
 *   @return {Object} A dictionary containing the set brightness and color temperature.
 */
function setLightValues(brightness: number, color_temp: string) {
  return {
    isError: false,
    brightness: brightness,
    colorTemperature: color_temp,
  };
}
