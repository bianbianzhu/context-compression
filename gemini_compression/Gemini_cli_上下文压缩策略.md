# Gemini CLI 聊天压缩分析

## 实现位置

> `packages/core/src/core/client.ts` - 主要压缩逻辑位于 `GeminiClient.tryCompressChat()`

## 1. 触发机制

### 自动触发

- **阈值**：模型 token 上限的 70%（`COMPRESSION_TOKEN_THRESHOLD = 0.7`）
- **检查频率**：每次调用 `sendMessageStream()` 开始时
- **防止失败重试**：使用 `hasFailedCompressionAttempt` 标志位来避免重试循环

### 手动触发

- 可以通过 `tryCompressChat()` 的 `force` 参数强制触发

## 2. 压缩策略

### 分割点算法（`findCompressSplitPoint()`）

- **保留比例**：保留最近 30% 的对话（`COMPRESSION_PRESERVE_THRESHOLD = 0.3`）
- **分割规则**：

  - 仅在用户消息处分割（不会在函数响应处分割）
  - 使用字符数来确定 70% 的位置
  - 确保最后一条消息不是未完成的函数调用
  - 如果最后一条消息是模型响应且没有函数调用，可以压缩整个历史

### 摘要生成

- **使用的模型**：与当前对话相同的模型
- **提示词工程**：使用专门的系统提示（`getCompressionPrompt()`）
- **输出格式**：结构化 XML，格式如下：
  <state_snapshot>
  <overall_goal>一句话描述目标</overall_goal>
  <key_knowledge>关键事实/约定的要点列表</key_knowledge>
  <file_system_state>已创建/修改/删除文件的状态</file_system_state>
  <recent_actions>最近重要操作的摘要</recent_actions>
  <current_plan>带有 [DONE]/[IN PROGRESS]/[TODO] 标记的逐步计划</current_plan>
  </state_snapshot>

## 3. 上下文保留

### 保留内容

- 环境上下文（操作系统、目录、git 状态）
- 最近 30% 的对话历史
- IDE 上下文（压缩后强制完整更新）

### 被压缩的内容

- 前 70% 的对话历史
- 被压缩为结构化的状态快照

## 4. 实现细节

### Token 计数

- 使用 `ContentGenerator.countTokens()` API
- 不同模型的限制：
  - `gemini-2.5-*`：1,048,576 tokens
  - `gemini-1.5-pro`：2,097,152 tokens
  - 默认：1,048,576 tokens

### 聊天重构

```typescript
// 压缩后的新聊天结构：
[
  { role: "user", parts: [environment_context] },
  { role: "model", parts: ["明白了，感谢提供上下文！"] },
  { role: "user", parts: [compressed_summary] },
  { role: "model", parts: ["明白了，感谢提供额外的上下文！"] },
  ...preserved_recent_history,
];
```

### 错误处理

- **Token 数验证**：确保压缩确实减少了 token 数量
- **膨胀保护**：如果压缩后内容更大则回滚
- **原子操作**：要么完全成功，要么彻底回滚
- **状态码**：

  - `COMPRESSED`：成功
  - `NOOP`：无需操作
  - `COMPRESSION_FAILED_INFLATED_TOKEN_COUNT`：摘要更大导致失败
  - `COMPRESSION_FAILED_TOKEN_COUNT_ERROR`：无法计算 token 数导致失败

## 5. 性能特征

### 优势

- 有效保留最近的上下文
- 结构化摘要能保持关键项目状态
- 自动触发可防止达到 token 上限
- 失败跟踪机制防止无限重试循环

### 潜在改进点

- 固定的 70/30 分割比例未必适用于所有对话
- 用户无法控制哪些内容被视为“重要”而得以保留
- 单次压缩可能导致复杂对话中的细节丢失

## 代码参考

- 主逻辑：`packages/core/src/core/client.ts:652-803`
- 分割算法：`packages/core/src/core/client.ts:71-111`
- 压缩提示词：`packages/core/src/core/prompts.ts:347-405`
- Token 限制：`packages/core/src/core/tokenLimits.ts`

## 遥测

- 记录压缩事件以及压缩前后的 token 数
- 通过 `ChatCompressed` 事件更新 UI 压缩状态
