import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Megaphone, Send, UploadCloud, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { SkeletonRows } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function BroadcastPage() {
  const contacts = trpc.broadcast.getContacts.useQuery();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = trpc.upload.productImage.useMutation();
  const sendToAll = trpc.broadcast.sendToAll.useMutation({
    onSuccess: (r) => setResult(`ส่งสำเร็จถึงลูกค้า ${r.sentTo} คน`),
  });
  const sendToSelected = trpc.broadcast.sendToSelected.useMutation({
    onSuccess: (r) => setResult(`ส่งสำเร็จถึงลูกค้า ${r.sentTo} คน`),
  });

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await uploadImage.mutateAsync({
        base64Data: base64,
        mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
      });
      setImageUrl(res.url);
    } finally {
      setUploading(false);
    }
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setResult(null);
    if (selected.size > 0) {
      sendToSelected.mutate({ lineUserIds: [...selected], text, imageUrl: imageUrl || undefined });
    } else {
      sendToAll.mutate({ text, imageUrl: imageUrl || undefined });
    }
  }

  const isPending = sendToAll.isPending || sendToSelected.isPending;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-navy-900 dark:text-slate-100">Broadcast</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> เลือกลูกค้า ({selected.size ? selected.size : "ทั้งหมด"})
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {contacts.isLoading && <SkeletonRows rows={4} />}
            {contacts.error && <ErrorState message={contacts.error.message} />}
            {contacts.data && contacts.data.length === 0 && (
              <EmptyState icon={Users} title="ยังไม่มีผู้ติดต่อ" />
            )}
            <ul className="space-y-1">
              {contacts.data?.map((c) => (
                <li key={c.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-navy-800/60",
                      selected.has(c.id) && "bg-accent-600/10",
                    )}
                  >
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                    <img
                      src={c.pictureUrl ?? `https://api.dicebear.com/9.x/initials/svg?seed=${c.displayName}`}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    <span className="text-sm text-navy-900 dark:text-slate-100">{c.displayName}</span>
                  </label>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" /> ข้อความ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) void handleFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 hover:border-accent-600 dark:border-navy-800/60"
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="preview" className="h-24 w-24 rounded-lg object-cover" />
                ) : (
                  <UploadCloud className="h-6 w-6" />
                )}
                <p>{uploading ? "กำลังอัพโหลด..." : "รูปโปรโมชั่น (ไม่บังคับ)"}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                  }}
                />
              </div>

              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="พิมพ์ข้อความโปรโมชั่น..."
                rows={5}
                required
              />

              {result && <p className="text-sm text-green-600">{result}</p>}
              {(sendToAll.error || sendToSelected.error) && (
                <p className="text-sm text-red-500">{(sendToAll.error ?? sendToSelected.error)?.message}</p>
              )}

              <Button type="submit" className="w-full" disabled={isPending}>
                <Send className="h-4 w-4" /> {isPending ? "กำลังส่ง..." : "ส่ง Broadcast"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
