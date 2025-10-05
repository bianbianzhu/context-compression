import { Schema } from "@google/genai";
import { Ajv, AnySchema, ErrorObject } from "ajv";

/**
 * @param {unknown} args - The arguments to validate
 * @param {Schema} schema - The schema to validate the arguments against. Schema Must only contain `type`, `properties`, `required` and `additionalProperties` fields.
 */
export function isArgsValid({
  args,
  schema,
}: {
  args: unknown;
  schema: Schema;
}): [null, unknown] | [ErrorObject[], null] {
  const ajv = new Ajv();

  const validate = ajv.compile(formatGeminiSchemaToAjvSchema(schema));

  const isValid = validate(args);

  if (!isValid) {
    return [validate.errors ?? [], null];
  }

  return [null, args];
}

/**
 * Format the gemini schema to the ajv schema:
 * 1. convert the `type` field from Type to lowercase string `number`, `string`, `boolean`, `object`, `array` etc.
 * Must only pass the parameters field from the gemini FunctionDeclaration schema
 */
export function formatGeminiSchemaToAjvSchema(schema: Schema): AnySchema {
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
