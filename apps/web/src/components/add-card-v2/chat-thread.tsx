'use client';

import { useEffect, useRef } from 'react';
import type { ChatBubble } from './types';

/**
 * Running chat-style history of completed Q+A pairs. Auto-scrolls to the
 * bottom whenever a new pair lands so the current question is always in
 * view. Voice-first conversational add-card flow (PRD §11.2.1).
 */
export function ChatThread({
  bubbles,
  currentQuestion,
  children,
}: {
  bubbles: ChatBubble[];
  currentQuestion?: string;
  children: React.ReactNode;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [bubbles.length, currentQuestion]);

  return (
    <div className="flex flex-col gap-3">
      <ul className="space-y-3" aria-live="polite">
        {bubbles.map((b, i) => (
          <li key={i} className="space-y-1.5">
            <div className="mr-auto max-w-[85%] rounded-2xl rounded-tl-sm bg-ph-fill-warm px-3 py-2 text-sm dark:bg-zinc-800">
              {b.question}
            </div>
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-ph-red/10 px-3 py-2 text-sm text-ph-ink dark:bg-ph-red/20 dark:text-zinc-100">
              {b.answerLabel}
            </div>
          </li>
        ))}
        {currentQuestion && (
          <li>
            <div className="mr-auto max-w-[85%] rounded-2xl rounded-tl-sm bg-ph-fill-warm px-3 py-2 text-sm dark:bg-zinc-800">
              {currentQuestion}
            </div>
          </li>
        )}
      </ul>
      <div>{children}</div>
      <div ref={bottomRef} />
    </div>
  );
}
