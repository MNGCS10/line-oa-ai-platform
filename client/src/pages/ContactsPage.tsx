import { Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeTH } from "@/lib/utils";

export function ContactsPage() {
  const { data, isLoading, error } = trpc.lineUsers.list.useQuery();

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-navy-900 dark:text-slate-100">รายชื่อลูกค้า (LINE Contacts)</h1>

      {isLoading && <SkeletonRows rows={6} />}
      {error && <ErrorState message={error.message} />}
      {data && data.length === 0 && (
        <EmptyState icon={Users} title="ยังไม่มีลูกค้า" description="ลูกค้าจะปรากฏที่นี่หลังทัก LINE OA ครั้งแรก" />
      )}

      {data && data.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-navy-800/60 dark:bg-navy-800/40">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs uppercase text-slate-500 dark:border-navy-800/60 dark:text-slate-400">
              <tr>
                <th className="p-3">ลูกค้า</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3">เข้าร่วมเมื่อ</th>
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 last:border-0 dark:border-navy-800/40">
                  <td className="flex items-center gap-3 p-3">
                    <img
                      src={u.pictureUrl ?? `https://api.dicebear.com/9.x/initials/svg?seed=${u.displayName}`}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-navy-900 dark:text-slate-100">{u.displayName}</p>
                      <p className="text-xs text-slate-400">{u.lineUserId}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    {u.isBlocked ? <Badge tone="danger">บล็อกแล้ว</Badge> : <Badge tone="success">ปกติ</Badge>}
                  </td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">{formatDateTimeTH(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
