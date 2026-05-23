---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/react-ai-sdk": patch
---

feat: surface AI SDK tool approval responses via `respondToApproval` on tool-call message parts. Adds a runtime-agnostic `respondToApproval({ approved, reason? })` method on `MessagePartRuntime` (and the `respondToApproval` prop on tool components) that wires through a new `onToolApprovalResponse` adapter callback. The AI SDK runtime maps it to `chatHelpers.addToolApprovalResponse` so server-side `approval-requested` tool states can be approved or denied from the UI.
