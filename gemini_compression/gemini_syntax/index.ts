import "dotenv/config";

import {
  Content,
  FunctionResponse,
  GenerateContentConfig,
  GoogleGenAI,
} from "@google/genai";
import { tools } from "./tools/index.js";
import { isArgsValid } from "./utils.js";

// Define the function declarations (tools list)
const functionDeclarations = Object.values(tools).map(
  (tool) => tool.functionDeclaration
);

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
  apiKey: process.env.GOOGLE_API_KEY,
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

// 可以从ai_message_with_function_call.json看到，functionCalls不是一个public属性，实际是通过GenerateContentResponse这个class的 get functionCalls() 方法获取的private属性
const { functionCalls } = response;

if (functionCalls?.length) {
  for (const functionCall of functionCalls) {
    const { name: functionName, args: functionArgs } = functionCall;

    if (!functionName) {
      throw new Error("LLM did not provide a function name for function call");
    }

    const tool = tools[functionName];

    if (tool) {
      const inputSchema = tool.functionDeclaration.parameters;
      const fn = tool.fn;
      if (!inputSchema) {
        throw new Error("Function declaration parameters are required");
      }

      const [errors, value] = isArgsValid({
        args: functionArgs,
        schema: inputSchema,
      });

      if (errors && errors.length > 0) {
        throw new Error(
          `Invalid function call arguments: ${errors
            .map((error) => error.message)
            .join(", ")}`
        );
      }

      const result = fn(value);

      const functionResponse: FunctionResponse = {
        // must be the same as the function call name from the model's function call
        name: functionName,
        // must be an object
        // result field is not required, but a good practice to include it
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

const response2 = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: contents,
  config: config,
});

contents.push(response2.candidates?.[0]?.content!);

console.log("contents: ", JSON.stringify(contents, null, 2));
