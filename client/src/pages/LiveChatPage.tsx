import { useState } from "react";
import type { FormEvent } from "react";
import { MessageCircle, Pause, Play, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { cn, formatDateTimeTH } from "@/lib/utils";

export function LiveChatPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const sessions = trpc.chatSessions.list.useQuery(undefined, { refetchInterval: 5000 });

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="w-full max-w-xs shrink-0 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-navy-800/60 dark:bg-navy-800/40">
        <div className="border-b border-slate-100 p-3 dark:border-navy-800/60">
          <h2 className="font-semibold text-navy-900 dark:text-slate-100">กล่องข้อความ</h2>
        </div>

        {sessions.isLoading && (
          <div className="p-3">
            <SkeletonRows rows={5} />
          </div>
        )}
        {sessions.error && <ErrorState message={sessions.error.message} />}
        {sessions.data && sessions.data.length === 0 && (
          <EmptyState icon={MessageCircle} title="ยังไม่มีการสนทนา" description="เมื่อลูกค้าทักผ่าน LINE OA จะแสดงที่นี่" />
        )}

        <ul>
          {sessions.data?.map((session) => (
            <li key={session.id}>
              <button
                onClick={() => setSelectedId(session.id)}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-slate-100 p-3 text-left hover:bg-slate-50 dark:border-navy-800/60 dark:hover:bg-navy-800/60",
                  selectedId === session.id && "bg-accent-600/10",
                )}
              >
                <img
                  src={session.lineUser.pictureUrl ?? `https://api.dicebear.com/9.x/initials/svg?seed=${session.lineUser.displayName}`}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-navy-900 dark:text-slate-100">
                      {session.lineUser.displayName}
                    </p>
                    {session.unreadCount > 0 && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-600 text-[10px] font-semibold text-white">
                        {session.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {session.aiPaused ? (
                      <Badge tone="warning">มนุษย์คุมอยู่</Badge>
                    ) : (
                      <Badge tone="info">AI ตอบอัตโนมัติ</Badge>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-navy-800/60 dark:bg-navy-800/40">
        {selectedId ? (
          <ChatThread chatSessionId={selectedId} />
        ) : (
          <EmptyState icon={MessageCircle} title="เลือกการสนทนา" description="เลือกลูกค้าจากรายการด้านซ้ายเพื่อดูข้อความ" />
        )}
      </div>
    </div>
  );
}

function ChatThread({ chatSessionId }: { chatSessionId: number }) {
  const [text, setText] = useState("");
  const utils = trpc.useUtils();
  const messages = trpc.chatSessions.getMessages.useQuery(
    { chatSessionId },
    { refetchInterval: 3000 },
  );
  const sessions = trpc.chatSessions.list.useQuery();
  const session = sessions.data?.find((s) => s.id === chatSessionId);

  const pauseAI = trpc.chatSessions.pauseAI.useMutation({ onSuccess: () => sessions.refetch() });
  const resumeAI = trpc.chatSessions.resumeAI.useMutation({ onSuccess: () => sessions.refetch() });
  const sendMessage = trpc.chatSessions.sendMessage.useMutation({
    onSuccess: () => {
      setText("");
      utils.chatSessions.getMessages.invalidate({ chatSessionId });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage.mutate({ chatSessionId, text });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 p-3 dark:border-navy-800/60">
        <p className="font-medium text-navy-900 dark:text-slate-100">{session?.lineUser.displayName ?? "..."}</p>
        {session?.aiPaused ? (
          <Button size="sm" variant="secondary" onClick={() => resumeAI.mutate({ chatSessionId })} disabled={resumeAI.isPending}>
            <Play className="h-4 w-4" /> ให้ AI ตอบต่อ
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => pauseAI.mutate({ chatSessionId })} disabled={pauseAI.isPending}>
            <Pause className="h-4 w-4" /> หยุด AI (คุมเอง)
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.isLoading && <SkeletonRows rows={4} />}
        {messages.data?.map((m) => (
          <div key={m.id} className={cn("flex", m.senderType === "customer" ? "justify-start" : "justify-end")}>
            <div
              className={cn(
                "max-w-[70%] rounded-2xl px-4 py-2 text-sm",
                m.senderType === "customer"
                  ? "bg-slate-100 text-navy-900 dark:bg-navy-800 dark:text-slate-100"
                  : m.senderType === "ai"
                    ? "bg-accent-600 text-white"
                    : "bg-navy-900 text-white dark:bg-slate-700",
              )}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              <p className="mt-1 text-[10px] opacity-70">{formatDateTimeTH(m.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-slate-100 p-3 dark:border-navy-800/60">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="พิมพ์ข้อความถึงลูกค้า..."
          className="flex-1"
        />
        <Button type="submit" disabled={sendMessage.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
