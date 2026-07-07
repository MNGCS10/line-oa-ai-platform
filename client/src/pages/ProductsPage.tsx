import { useRef, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import { Package, Plus, Trash2, UploadCloud } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";

type ProductFormState = {
  name: string;
  description: string;
  priceLabel: string;
  category: string;
  imageUrl: string;
};

const EMPTY_FORM: ProductFormState = { name: "", description: "", priceLabel: "", category: "", imageUrl: "" };

export function ProductsPage() {
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.products.list.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createProduct = trpc.products.create.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
  });
  const deleteProduct = trpc.products.delete.useMutation({
    onSuccess: () => utils.products.list.invalidate(),
  });
  const uploadImage = trpc.upload.productImage.useMutation();

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await uploadImage.mutateAsync({
        base64Data: base64,
        mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
      });
      setForm((f) => ({ ...f, imageUrl: result.url }));
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    createProduct.mutate({
      name: form.name,
      description: form.description || undefined,
      priceLabel: form.priceLabel,
      category: form.category || undefined,
      imageUrl: form.imageUrl || undefined,
      isActive: true,
      sortOrder: 0,
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-navy-900 dark:text-slate-100">สินค้า/บริการ</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> เพิ่มสินค้า
        </Button>
      </div>

      {isLoading && <SkeletonRows rows={4} />}
      {error && <ErrorState message={error.message} />}
      {data && data.length === 0 && (
        <EmptyState icon={Package} title="ยังไม่มีสินค้า" description="เพิ่มสินค้า/บริการเพื่อให้ AI แนะนำลูกค้าได้" />
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Card key={p.id}>
              {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="h-40 w-full rounded-t-xl object-cover" />}
              <CardContent>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-navy-900 dark:text-slate-100">{p.name}</p>
                    <p className="text-sm text-accent-600">{p.priceLabel}</p>
                  </div>
                  <button
                    onClick={() => deleteProduct.mutate({ id: p.id })}
                    className="text-slate-400 hover:text-red-500"
                    aria-label="ลบสินค้า"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {p.description && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{p.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="เพิ่มสินค้า/บริการ">
        <form onSubmit={onSubmit} className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 hover:border-accent-600 dark:border-navy-800/60"
            onClick={() => fileInputRef.current?.click()}
          >
            {form.imageUrl ? (
              <img src={form.imageUrl} alt="preview" className="h-24 w-24 rounded-lg object-cover" />
            ) : (
              <UploadCloud className="h-8 w-8" />
            )}
            <p>{uploading ? "กำลังอัพโหลด..." : "ลากรูปมาวาง หรือคลิกเพื่อเลือกไฟล์"}</p>
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

          <div>
            <label className="mb-1 block text-sm font-medium text-navy-900 dark:text-slate-200">ชื่อสินค้า/บริการ</label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-navy-900 dark:text-slate-200">ราคา (เช่น ฿500–800/ครั้ง)</label>
            <Input value={form.priceLabel} onChange={(e) => setForm((f) => ({ ...f, priceLabel: e.target.value }))} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-navy-900 dark:text-slate-200">หมวดหมู่</label>
            <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-navy-900 dark:text-slate-200">รายละเอียด</label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          {createProduct.error && <p className="text-sm text-red-500">{createProduct.error.message}</p>}
          <Button type="submit" className="w-full" disabled={createProduct.isPending}>
            บันทึก
          </Button>
        </form>
      </Dialog>
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
