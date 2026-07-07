const BUFFER_WINDOW_MS = 2000;

export interface BufferedItem {
  text: string;
  imageBase64?: string;
  imageMediaType?: string;
}

interface PendingBuffer {
  items: BufferedItem[];
  timer: ReturnType<typeof setTimeout>;
}

const pending = new Map<number, PendingBuffer>();

/**
 * Coalesces rapid-fire messages from the same chat session (e.g. someone typing several
 * short lines in a row) into a single AI turn, per spec: "รวมข้อความสั้นๆ หลายอันภายใน 2 วินาที".
 */
export function bufferMessage(
  chatSessionId: number,
  item: BufferedItem,
  onFlush: (items: BufferedItem[]) => void | Promise<void>,
): void {
  const existing = pending.get(chatSessionId);
  if (existing) {
    clearTimeout(existing.timer);
    existing.items.push(item);
    existing.timer = setTimeout(() => flush(chatSessionId, onFlush), BUFFER_WINDOW_MS);
    return;
  }

  pending.set(chatSessionId, {
    items: [item],
    timer: setTimeout(() => flush(chatSessionId, onFlush), BUFFER_WINDOW_MS),
  });
}

function flush(chatSessionId: number, onFlush: (items: BufferedItem[]) => void | Promise<void>): void {
  const buffer = pending.get(chatSessionId);
  if (!buffer) return;
  pending.delete(chatSessionId);
  void onFlush(buffer.items);
}
