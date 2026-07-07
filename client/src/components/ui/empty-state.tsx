import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-slate-500 dark:text-slate-400">
      <Icon className="h-10 w-10 text-slate-300 dark:text-navy-800" />
      <p className="font-medium text-navy-900 dark:text-slate-200">{title}</p>
      {description && <p className="text-sm max-w-xs">{description}</p>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-red-500">
      <p className="font-medium">เกิดข้อผิดพลาด</p>
      <p className="text-sm max-w-sm">{message}</p>
    </div>
  );
}
