type Part = {
  functionResponse?: unknown;
  functionCall?: unknown;
  text?: string;
};

type Content = {
  role?: "user" | "model";
  parts?: Part[];
};

/**
 * Returns the index of the oldest item to keep when compressing. May return
 * contents.length which indicates that everything should be compressed.
 */
function findCompressSplitPoint(contents: Content[], fraction: number): number {
  if (fraction <= 0 || fraction >= 1) {
    throw new Error("Fraction must be between 0 and 1");
  }

  const charCounts = contents.map((content) => JSON.stringify(content).length);
  const totalCharCount = charCounts.reduce((a, b) => a + b, 0);
  const targetCharCount = totalCharCount * fraction;

  let lastSplitPoint = 0;
  let cumulativeCharCount = 0;
  for (let i = 0; i < contents.length; i++) {
    const content = contents[i];
    if (
      content.role === "user" &&
      !content.parts?.some((part) => !!part.functionResponse)
    ) {
      if (cumulativeCharCount >= targetCharCount) {
        return i;
      }
      lastSplitPoint = i;
    }
    cumulativeCharCount += charCounts[i];
  }

  const lastContent = contents[contents.length - 1];
  if (
    lastContent?.role === "model" &&
    !lastContent?.parts?.some((part) => part.functionCall)
  ) {
    return contents.length;
  }

  return lastSplitPoint;
}

function summarize(contents: Content[]): string {
  const roles = contents.map((c) => c.role ?? "(none)");
  return `[${roles.join(", ")}]`;
}

function runScenario(
  name: string,
  contents: Content[],
  fraction: number
): void {
  const charCounts = contents.map((c) => JSON.stringify(c).length);
  const total = charCounts.reduce((a, b) => a + b, 0);
  const target = total * fraction;
  const split = findCompressSplitPoint(contents, fraction);
  const toCompress = contents.slice(0, split);
  const toKeep = contents.slice(split);
  console.log("\n===", name, "===");
  console.log("fraction:", fraction);
  console.log("roles:", summarize(contents));
  console.log(
    "charCounts:",
    charCounts,
    "total:",
    total,
    "target:",
    Math.round(target)
  );
  console.log("splitPoint:", split);
  console.log(
    "compress indices: [0..",
    split - 1,
    "] roles:",
    summarize(toCompress)
  );
  console.log(
    "keep indices: [",
    split,
    "..",
    contents.length - 1,
    "] roles:",
    summarize(toKeep)
  );
}

function main(): void {
  const base: Content[] = [
    { role: "user", parts: [{ text: "Hello" }] },
    { role: "model", parts: [{ text: "Hi!" }] },
    { role: "user", parts: [{ text: "Please process order #123" }] },
    { role: "model", parts: [{ text: "Processing started." }] },
    { role: "user", parts: [{ text: "Any update?" }] },
    { role: "model", parts: [{ text: "Shipped." }] },
  ];

  runScenario("Scenario 1: Typical conversation, fraction=0.7", base, 0.7);

  const safeAll: Content[] = [
    { role: "user", parts: [{ text: "A" }] },
    { role: "model", parts: [{ text: "B" }] },
    { role: "user", parts: [{ text: "C" }] },
    { role: "model", parts: [{ text: "D" }] },
    { role: "model", parts: [{ text: "Last model reply, no functionCall" }] },
  ];
  runScenario(
    "Scenario 2: Safe to compress everything (last is model w/o functionCall)",
    safeAll,
    0.95
  );

  const lastHasFunctionCall: Content[] = [
    { role: "user", parts: [{ text: "Step 1" }] },
    { role: "model", parts: [{ text: "Ok" }] },
    { role: "user", parts: [{ text: "Step 2" }] },
    { role: "model", parts: [{ text: "Ok" }] },
    {
      role: "model",
      parts: [{ functionCall: { name: "toolX" }, text: "Calling tool" }],
    },
  ];
  runScenario(
    "Scenario 3: Cannot compress everything (last model has functionCall)",
    lastHasFunctionCall,
    0.95
  );

  const userWithFunctionResponse: Content[] = [
    { role: "user", parts: [{ text: "Query 1" }] },
    { role: "model", parts: [{ text: "Resp 1" }] },
    { role: "user", parts: [{ functionResponse: { result: "data" } }] },
    { role: "model", parts: [{ text: "Resp 2" }] },
  ];
  runScenario(
    "Scenario 4: User message with functionResponse is not a split point",
    userWithFunctionResponse,
    0.6
  );

  const compressLastSplitPoint: Content[] = [
    { role: "user", parts: [{ text: "A" }] },
    { role: "model", parts: [{ text: "B" }] },
    { role: "user", parts: [{ text: "C" }] },
    { role: "model", parts: [{ text: "D" }] },
    { role: "user", parts: [{ text: "E" }] },
    { role: "model", parts: [{ text: "F" }] },
  ];
  runScenario(
    "Scenario 5: Compress last split point",
    compressLastSplitPoint,
    0.6
  );

  // edge case scenarios
  const onlyOneUser: Content[] = [{ role: "user", parts: [{ text: "A" }] }];
  runScenario("Scenario 6: Only one user message", onlyOneUser, 0.7);

  const hypothetical: Content[] = [
    { role: "user", parts: [{ text: "A11" }] },
    { role: "model", parts: [{ text: "B1" }] },
    { role: "user", parts: [{ text: "C11" }] },
    { role: "model", parts: [{ text: "D1" }] },
    { role: "user", parts: [{ text: "E11" }] },
    { role: "model", parts: [{ text: "F1" }] },
    { role: "user", parts: [{ text: "G11" }] },
    { role: "model", parts: [{ text: "H1" }] },
    { role: "user", parts: [{ text: "I11" }] },
    { role: "model", parts: [{ text: "J1" }] },
  ];
  runScenario("Scenario 7: Hypothetical", hypothetical, 0.95);

  const hypothetical2: Content[] = [
    { role: "user", parts: [{ text: "A22" }] },
    { role: "model", parts: [{ text: "B2" }] },
    { role: "user", parts: [{ text: "C22" }] },
    { role: "model", parts: [{ text: "D2" }] },
    { role: "user", parts: [{ text: "E22" }] },
    { role: "model", parts: [{ text: "F2" }] },
    { role: "user", parts: [{ text: "G22" }] },
    { role: "model", parts: [{ text: "H2" }] },
    { role: "user", parts: [{ text: "I22" }] },
    { role: "model", parts: [{ functionCall: { name: "toolX" } }] },
  ];
  runScenario("Scenario 8: Hypothetical2", hypothetical2, 0.95);

  const hypothetical3: Content[] = [
    { role: "user", parts: [{ text: "A22" }] },
    { role: "model", parts: [{ text: "B2" }] },
    { role: "user", parts: [{ text: "C22" }] },
    { role: "model", parts: [{ text: "D2", functionCall: { name: "toolX" } }] },
    { role: "user", parts: [{ functionResponse: { result: "data" } }] },
    { role: "model", parts: [{ text: "F2" }] },
    { role: "user", parts: [{ text: "G22" }] },
    { role: "model", parts: [{ functionCall: { name: "toolY" } }] },
    { role: "user", parts: [{ functionResponse: { result: "data" } }] },
    { role: "model", parts: [{ text: "F2" }] },
    { role: "user", parts: [{ text: "H22" }] },
    { role: "model", parts: [{ text: "I2" }] },
  ];
  runScenario("Scenario 9: Hypothetical3", hypothetical3, 0.6);

  try {
    findCompressSplitPoint(base, 1);
  } catch (e) {
    console.log(
      "\nScenario 5: Invalid fraction (>=1) throws error:",
      (e as Error).message
    );
  }
}

main();
