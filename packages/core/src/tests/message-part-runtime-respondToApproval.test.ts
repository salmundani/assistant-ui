import { describe, it, expect, vi } from "vitest";
import { MessagePartRuntimeImpl } from "../runtime/api/message-part-runtime";
import type { MessagePartState } from "../runtime/api/message-part-runtime";
import type { ThreadRuntimeCoreBinding } from "../runtime/api/thread-runtime";

const makeBindings = (state: MessagePartState) => {
  const respondToToolApproval = vi.fn();
  const threadCore = { respondToToolApproval } as any;
  const threadBinding = {
    getState: () => threadCore,
    subscribe: () => () => {},
    path: {} as any,
    outerSubscribe: () => () => {},
    getStateState: () => threadCore,
  } as unknown as ThreadRuntimeCoreBinding;
  const contentBinding = {
    getState: () => state,
    subscribe: () => () => {},
    path: {} as any,
  } as any;
  return { contentBinding, threadBinding, respondToToolApproval };
};

const toolCallState = (
  overrides: Partial<MessagePartState> = {},
): MessagePartState =>
  ({
    type: "tool-call",
    toolCallId: "tc-1",
    toolName: "deploy",
    args: {},
    argsText: "{}",
    status: { type: "requires-action", reason: "interrupt" },
    interrupt: { type: "human", payload: { id: "appr-xyz" } },
    ...overrides,
  }) as MessagePartState;

describe("MessagePartRuntimeImpl.respondToApproval", () => {
  it("forwards toolCallId and raw interrupt payload to the runtime", () => {
    const { contentBinding, threadBinding, respondToToolApproval } =
      makeBindings(toolCallState());
    const runtime = new MessagePartRuntimeImpl(
      contentBinding,
      undefined,
      threadBinding,
    );

    runtime.respondToApproval({ approved: true });

    expect(respondToToolApproval).toHaveBeenCalledWith({
      toolCallId: "tc-1",
      interruptPayload: { id: "appr-xyz" },
      approved: true,
    });
  });

  it("forwards optional reason on denial", () => {
    const { contentBinding, threadBinding, respondToToolApproval } =
      makeBindings(toolCallState());
    const runtime = new MessagePartRuntimeImpl(
      contentBinding,
      undefined,
      threadBinding,
    );

    runtime.respondToApproval({ approved: false, reason: "too risky" });

    expect(respondToToolApproval).toHaveBeenCalledWith({
      toolCallId: "tc-1",
      interruptPayload: { id: "appr-xyz" },
      approved: false,
      reason: "too risky",
    });
  });

  it("forwards opaque payload shapes without inspecting them", () => {
    const customPayload = { value: "anything", resumable: true };
    const { contentBinding, threadBinding, respondToToolApproval } =
      makeBindings(
        toolCallState({
          interrupt: { type: "human", payload: customPayload },
        } as any),
      );
    const runtime = new MessagePartRuntimeImpl(
      contentBinding,
      undefined,
      threadBinding,
    );

    runtime.respondToApproval({ approved: true });

    expect(respondToToolApproval).toHaveBeenCalledWith({
      toolCallId: "tc-1",
      interruptPayload: customPayload,
      approved: true,
    });
  });

  it("throws when the part is not a tool-call", () => {
    const { contentBinding, threadBinding } = makeBindings({
      type: "text",
      text: "hi",
      status: { type: "complete" },
    } as MessagePartState);
    const runtime = new MessagePartRuntimeImpl(
      contentBinding,
      undefined,
      threadBinding,
    );

    expect(() => runtime.respondToApproval({ approved: true })).toThrow(
      /non-tool message part/,
    );
  });

  it("throws when the tool call has no pending approval interrupt", () => {
    const { contentBinding, threadBinding } = makeBindings(
      toolCallState({ interrupt: undefined } as any),
    );
    const runtime = new MessagePartRuntimeImpl(
      contentBinding,
      undefined,
      threadBinding,
    );

    expect(() => runtime.respondToApproval({ approved: true })).toThrow(
      /no pending approval/,
    );
  });
});
