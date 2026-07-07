export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
  imageBase64?: string;
  imageMediaType?: string;
}

const MAX_HISTORY_MESSAGES = 20;

/** Keeps only the most recent N messages so the LLM context doesn't grow unbounded. */
export function trimConversationHistory(
  messages: HistoryMessage[],
  limit = MAX_HISTORY_MESSAGES,
): HistoryMessage[] {
  if (messages.length <= limit) return messages;
  return messages.slice(messages.length - limit);
}
