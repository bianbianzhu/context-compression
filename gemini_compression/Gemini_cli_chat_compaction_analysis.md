> # Gemini CLI Chat Compaction Analysis
>
> ## Implementation Location
>
> `packages/core/src/core/client.ts` - Main compression logic in `GeminiClient.tryCompressChat()`
>
> ## 1. Trigger Mechanism
>
> ### Automatic Triggering
>
> - **Threshold**: 70% of model's token limit (`COMPRESSION_TOKEN_THRESHOLD = 0.7`)
> - **Check Frequency**: At the start of each `sendMessageStream()` call
> - **Failure Prevention**: Tracks `hasFailedCompressionAttempt` flag to avoid retry loops
>
> ### Manual Triggering
>
> - Can be forced via `force` parameter in `tryCompressChat()`
>
> ## 2. Compression Strategy
>
> ### Split Point Algorithm (`findCompressSplitPoint()`)
>
> - **Preservation Ratio**: Keeps most recent 30% of chat (`COMPRESSION_PRESERVE_THRESHOLD = 0.3`)
> - **Split Rules**:
>
>   - Only splits at user messages (not at function responses)
>   - Uses character count to determine 70% point
>   - Ensures last message isn't a pending function call
>   - Can compress entire history if last message is a model response without function calls
>
> ### Summary Generation
>
> - **Model Used**: Same as current conversation model
> - **Prompt Engineering**: Specialized system prompt (`getCompressionPrompt()`)
> - **Output Format**: Structured XML with:
>   <state_snapshot>
>   <overall_goal>Single sentence describing objective</overall_goal>
>   <key_knowledge>Bullet points of critical facts/conventions</key_knowledge>
>   <file_system_state>Created/modified/deleted files status</file_system_state>
>   <recent_actions>Summary of last significant actions</recent_actions>
>   <current_plan>Step-by-step plan with [DONE]/[IN PROGRESS]/[TODO] markers</current_plan>
>   </state_snapshot>
>
> ## 3. Context Preservation
>
> ### What's Preserved
>
> - Environment context (OS, directory, git status)
> - Last 30% of conversation history
> - IDE context (forced full update after compression)
>
> ### What's Compressed
>
> - First 70% of conversation history
> - Condensed into structured state snapshot
>
> ## 4. Implementation Details
>
> ### Token Counting
>
> - Uses `ContentGenerator.countTokens()` API
> - Model-specific limits:
>
>   - `gemini-2.5-*`: 1,048,576 tokens
>   - `gemini-1.5-pro`: 2,097,152 tokens
>   - Default: 1,048,576 tokens
>
> ### Chat Reconstruction
>
> // New chat structure after compression:
> [
> { role: 'user', parts: [environment_context] },
> { role: 'model', parts: ['Got it. Thanks for the context!'] },
> { role: 'user', parts: [compressed_summary] },
> { role: 'model', parts: ['Got it. Thanks for the additional context!'] },
> ...preserved_recent_history
> ]
>
> ### Error Handling
>
> - **Token Count Verification**: Ensures compression actually reduces tokens
> - **Inflation Protection**: Reverts if compressed version is larger
> - **Atomic Operation**: Either fully succeeds or completely reverts
> - **Status Codes**:
>
>   - `COMPRESSED`: Success
>   - `NOOP`: No action needed
>   - `COMPRESSION_FAILED_INFLATED_TOKEN_COUNT`: Summary was larger
>   - `COMPRESSION_FAILED_TOKEN_COUNT_ERROR`: Couldn't count tokens
>
> ## 5. Performance Characteristics
>
> ### Strengths
>
> - Preserves recent context effectively
> - Structured summary maintains critical project state
> - Automatic trigger prevents hitting token limits
> - Failure tracking prevents infinite retry loops
>
> ### Potential Improvements
>
> - Fixed 70/30 split might not be optimal for all conversations
> - No user control over what's considered "important" to preserve
> - Single compression attempt might lose nuance in complex conversations
>
> ## Code References
>
> - Main logic: `packages/core/src/core/client.ts:652-803`
> - Split algorithm: `packages/core/src/core/client.ts:71-111`
> - Compression prompt: `packages/core/src/core/prompts.ts:347-405`
> - Token limits: `packages/core/src/core/tokenLimits.ts`
>
> ## Telemetry
>
> - Logs compression events with before/after token counts
> - Updates UI with compression status via `ChatCompressed` event
