"use client";

import { type Chat, useChat } from "@ai-sdk/react";
import { APICallError, type UIMessage } from "ai";
import { SendIcon, SquareIcon } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CoachMessage } from "@/components/coach-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MAX_QUESTION_CHARS, PASSCODE_HEADER } from "@/lib/coach/constants";
import { coachStarters } from "@/lib/coach/context";
import { readPasscode, subscribePasscode, writePasscode } from "@/lib/coach/passcode-store";
import type { CoachContext } from "@/lib/coach/schema";

export function CoachDialog({
  chat,
  context,
  open,
  onOpenChange,
}: {
  chat: Chat<UIMessage>;
  context: CoachContext;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Coach</DialogTitle>
          <DialogDescription>
            {context.focusZone === null
              ? "Find the habit that cost you the most."
              : `What cost you on zone ${context.focusZone}, and what to do next.`}
          </DialogDescription>
        </DialogHeader>
        <CoachChat chat={chat} context={context} />
      </DialogContent>
    </Dialog>
  );
}

function CoachChat({ chat, context }: { chat: Chat<UIMessage>; context: CoachContext }) {
  const passcode = useSyncExternalStore(subscribePasscode, readPasscode, () => "");
  const { messages, sendMessage, regenerate, stop, clearError, status, error } = useChat({ chat });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";
  const locked = !passcode || statusCode(error) === 401;

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const options = (code: string) => ({ headers: { [PASSCODE_HEADER]: code }, body: { context } });

  function ask(text: string) {
    const question = text.trim();
    if (!question || busy || locked) return;
    void sendMessage({ text: question }, options(passcode));
    setInput("");
  }

  function unlock(code: string) {
    writePasscode(code);
    if (status !== "error") return;
    clearError();
    void regenerate(options(code));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div ref={scrollRef} className="-mx-1 grid min-h-24 flex-1 content-start gap-3 overflow-y-auto px-1">
        {messages.length === 0 ? (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Every zone is three choices: where you go, when you leave, and what you do if you meet a team.
              The coach tells you which one cost you, the rule to remember, and what to try next. It can also
              look up the real game.
            </p>
            <div className="flex flex-wrap gap-2">
              {coachStarters(context).map((starter) => (
                <Button key={starter} type="button" variant="outline" size="sm" disabled={locked} onClick={() => ask(starter)}>
                  {starter}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <CoachMessage
              key={message.id}
              message={message}
              streaming={status === "streaming" && index === messages.length - 1}
            />
          ))
        )}
        {status === "submitted" ? <p className="text-xs text-muted-foreground motion-safe:animate-pulse">Thinking…</p> : null}
        {error && !locked ? <ErrorNotice error={error} onRetry={() => void regenerate(options(passcode))} /> : null}
      </div>
      {locked ? (
        <PasscodeForm wrong={statusCode(error) === 401} onUnlock={unlock} />
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            ask(input);
          }}
        >
          <Input
            value={input}
            maxLength={MAX_QUESTION_CHARS}
            placeholder="Ask a follow-up…"
            aria-label="Ask the coach"
            onChange={(event) => setInput(event.currentTarget.value)}
          />
          {busy ? (
            <Button type="button" variant="outline" size="icon" aria-label="Stop" onClick={() => void stop()}>
              <SquareIcon />
            </Button>
          ) : (
            <Button type="submit" size="icon" aria-label="Send" disabled={!input.trim()}>
              <SendIcon />
            </Button>
          )}
        </form>
      )}
    </div>
  );
}

function PasscodeForm({ wrong, onUnlock }: { wrong: boolean; onUnlock: (code: string) => void }) {
  const [code, setCode] = useState("");
  return (
    <form
      className="grid gap-2"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (code.trim()) onUnlock(code.trim());
      }}
    >
      <p className="text-xs text-muted-foreground">
        {wrong ? "That passcode didn't work." : "Enter your coach passcode. It's saved in this browser."}
      </p>
      <div className="flex gap-2">
        <Input
          type="password"
          value={code}
          autoComplete="current-password"
          aria-label="Coach passcode"
          onChange={(event) => setCode(event.currentTarget.value)}
        />
        <Button type="submit" disabled={!code.trim()}>
          Unlock
        </Button>
      </div>
    </form>
  );
}

function ErrorNotice({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs">
      <span>{errorText(error)}</span>
      <Button type="button" variant="outline" size="xs" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function statusCode(error: Error | undefined): number | null {
  return APICallError.isInstance(error) ? (error.statusCode ?? null) : null;
}

function errorText(error: Error): string {
  const code = statusCode(error);
  if (code === 402) return "AI credits are used up for now.";
  if (code === 429) return "Too many questions at once. Wait a moment.";
  return error.message || "The coach hit an error.";
}
