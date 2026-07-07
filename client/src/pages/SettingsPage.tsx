import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/empty-state";
import { AI_PROVIDER_KINDS, type AiProviderKind } from "shared";

export function SettingsPage() {
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.settings.get.useQuery();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-navy-900 dark:text-slate-100">ตั้งค่าระบบ</h1>

      {isLoading && <SkeletonRows rows={6} />}
      {error && <ErrorState message={error.message} />}

      {data && (
        <>
          <CompanyInfoForm initial={data.company} onSaved={() => utils.settings.get.invalidate()} />
          <LineCredentialsForm system={data.system} onSaved={() => utils.settings.get.invalidate()} />
          <LiffConfigForm system={data.system} onSaved={() => utils.settings.get.invalidate()} />
          <AiProviderForm providers={data.providers} models={data.models} onSaved={() => utils.settings.get.invalidate()} />
        </>
      )}
    </div>
  );
}

function CompanyInfoForm({
  initial,
  onSaved,
}: {
  initial: RouterOutputs["settings"]["get"]["company"];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    businessName: initial?.businessName ?? "",
    businessType: initial?.businessType ?? "",
    businessHours: initial?.businessHours ?? "",
    address: initial?.address ?? "",
    phone: initial?.phone ?? "",
    lineOaId: initial?.lineOaId ?? "",
    customerJourney: initial?.customerJourney ?? "",
    aiPersonaName: initial?.aiPersonaName ?? "",
    aiPersonaStyle: initial?.aiPersonaStyle ?? "",
    aiPersonaLanguageNote: initial?.aiPersonaLanguageNote ?? "",
  });
  const update = trpc.settings.updateCompanyInfo.useMutation({ onSuccess: onSaved });

  useEffect(() => {
    if (initial) {
      setForm({
        businessName: initial.businessName,
        businessType: initial.businessType,
        businessHours: initial.businessHours,
        address: initial.address,
        phone: initial.phone ?? "",
        lineOaId: initial.lineOaId ?? "",
        customerJourney: initial.customerJourney ?? "",
        aiPersonaName: initial.aiPersonaName,
        aiPersonaStyle: initial.aiPersonaStyle,
        aiPersonaLanguageNote: initial.aiPersonaLanguageNote ?? "",
      });
    }
  }, [initial]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    update.mutate(form);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ข้อมูลธุรกิจ + บุคลิก AI</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="ชื่อธุรกิจ">
            <Input value={form.businessName} onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))} required />
          </Field>
          <Field label="ประเภทธุรกิจ">
            <Input value={form.businessType} onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value }))} required />
          </Field>
          <Field label="เวลาทำการ">
            <Input value={form.businessHours} onChange={(e) => setForm((f) => ({ ...f, businessHours: e.target.value }))} required />
          </Field>
          <Field label="เบอร์โทร">
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </Field>
          <Field label="LINE OA ID">
            <Input value={form.lineOaId} onChange={(e) => setForm((f) => ({ ...f, lineOaId: e.target.value }))} />
          </Field>
          <Field label="ชื่อ AI">
            <Input value={form.aiPersonaName} onChange={(e) => setForm((f) => ({ ...f, aiPersonaName: e.target.value }))} required />
          </Field>
          <Field label="ที่อยู่" full>
            <Textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={2} required />
          </Field>
          <Field label="บุคลิก AI" full>
            <Textarea value={form.aiPersonaStyle} onChange={(e) => setForm((f) => ({ ...f, aiPersonaStyle: e.target.value }))} rows={2} required />
          </Field>
          <Field label="หมายเหตุด้านภาษา" full>
            <Input value={form.aiPersonaLanguageNote} onChange={(e) => setForm((f) => ({ ...f, aiPersonaLanguageNote: e.target.value }))} />
          </Field>
          <Field label="ขั้นตอนการดำเนินงาน (Customer Journey)" full>
            <Textarea value={form.customerJourney} onChange={(e) => setForm((f) => ({ ...f, customerJourney: e.target.value }))} rows={4} />
          </Field>

          <div className="md:col-span-2">
            {update.error && <p className="mb-2 text-sm text-red-500">{update.error.message}</p>}
            <Button type="submit" disabled={update.isPending}>
              บันทึกข้อมูลธุรกิจ
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function LineCredentialsForm({ system, onSaved }: { system: Record<string, unknown>; onSaved: () => void }) {
  const [channelAccessToken, setChannelAccessToken] = useState("");
  const [channelSecret, setChannelSecret] = useState("");
  const update = trpc.settings.updateLineCredentials.useMutation({
    onSuccess: () => {
      setChannelAccessToken("");
      setChannelSecret("");
      onSaved();
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    update.mutate({ channelAccessToken, channelSecret });
  }

  const maskedToken = system.line_channel_access_token as string | undefined;
  const maskedSecret = system.line_channel_secret as string | undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>LINE Official Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={`Channel Access Token ${maskedToken ? `(ปัจจุบัน: ${maskedToken})` : ""}`}>
            <Input
              value={channelAccessToken}
              onChange={(e) => setChannelAccessToken(e.target.value)}
              placeholder="วาง Channel Access Token ใหม่"
              type="password"
            />
          </Field>
          <Field label={`Channel Secret ${maskedSecret ? `(ปัจจุบัน: ${maskedSecret})` : ""}`}>
            <Input
              value={channelSecret}
              onChange={(e) => setChannelSecret(e.target.value)}
              placeholder="วาง Channel Secret ใหม่"
              type="password"
            />
          </Field>
          {update.error && <p className="text-sm text-red-500">{update.error.message}</p>}
          <Button type="submit" disabled={update.isPending || !channelAccessToken || !channelSecret}>
            บันทึก LINE Credentials
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function LiffConfigForm({ system, onSaved }: { system: Record<string, unknown>; onSaved: () => void }) {
  const [liffId, setLiffId] = useState((system.liff_id as string) ?? "");
  const [liffChannelId, setLiffChannelId] = useState((system.liff_channel_id as string) ?? "");
  const [ownerLineUserId, setOwnerLineUserId] = useState((system.owner_line_user_id as string) ?? "");

  const updateLiff = trpc.settings.updateLiffConfig.useMutation({ onSuccess: onSaved });
  const updateOwner = trpc.system.setOwnerLineUserId.useMutation({ onSuccess: onSaved });

  return (
    <Card>
      <CardHeader>
        <CardTitle>LIFF Booking Form</CardTitle>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          สำหรับฟอร์มจองนัดที่ลูกค้ากรอกผ่าน LINE (LIFF) — ต้องสร้าง LIFF app ในช่องทางเดียวกับ LINE Login ก่อน
          แล้วนำ LIFF ID กับ Channel ID มาใส่ที่นี่ เพื่อให้ระบบยืนยันตัวตนลูกค้าได้อย่างปลอดภัย
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateLiff.mutate({ liffId, liffChannelId });
          }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <Field label="LIFF ID">
            <Input value={liffId} onChange={(e) => setLiffId(e.target.value)} placeholder="เช่น 1234567890-abcdefgh" required />
          </Field>
          <Field label="LINE Login Channel ID (ใช้ยืนยัน ID token)">
            <Input value={liffChannelId} onChange={(e) => setLiffChannelId(e.target.value)} required />
          </Field>
          <div className="md:col-span-2">
            {updateLiff.error && <p className="mb-2 text-sm text-red-500">{updateLiff.error.message}</p>}
            <Button type="submit" disabled={updateLiff.isPending}>
              บันทึก LIFF Config
            </Button>
          </div>
        </form>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateOwner.mutate({ lineUserId: ownerLineUserId });
          }}
          className="space-y-3 border-t border-slate-100 pt-4 dark:border-navy-800/60"
        >
          <Field label="LINE userId ของเจ้าของธุรกิจ (รับแจ้งเตือนนัดหมายใหม่)">
            <Input value={ownerLineUserId} onChange={(e) => setOwnerLineUserId(e.target.value)} placeholder="U1234567890abcdef..." />
          </Field>
          {updateOwner.error && <p className="text-sm text-red-500">{updateOwner.error.message}</p>}
          <Button type="submit" variant="secondary" disabled={updateOwner.isPending}>
            บันทึก
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AiProviderForm({
  providers,
  models,
  onSaved,
}: {
  providers: { id: number; kind: string; label: string; isActive: boolean }[];
  models: { id: number; providerId: number; modelId: string; label: string; isDefault: boolean }[];
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<AiProviderKind>("anthropic");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState("");
  const [modelLabel, setModelLabel] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(providers[0]?.id ?? null);

  const addProvider = trpc.settings.upsertAiProvider.useMutation({
    onSuccess: (r) => {
      setSelectedProviderId(r.id);
      setLabel("");
      setApiKey("");
      onSaved();
    },
  });
  const addModel = trpc.settings.upsertAiModel.useMutation({
    onSuccess: () => {
      setModelId("");
      setModelLabel("");
      onSaved();
    },
  });
  const setActive = trpc.settings.setActiveAiModel.useMutation({ onSuccess: onSaved });

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Provider</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addProvider.mutate({ kind, label, apiKey });
          }}
          className="grid grid-cols-1 gap-3 md:grid-cols-4"
        >
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as AiProviderKind)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-navy-800/60 dark:bg-navy-900"
          >
            {AI_PROVIDER_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <Input placeholder="ชื่อ provider" value={label} onChange={(e) => setLabel(e.target.value)} required />
          <Input placeholder="API Key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} required />
          <Button type="submit" disabled={addProvider.isPending}>
            เพิ่ม Provider
          </Button>
        </form>

        <div className="space-y-2">
          {providers.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2 text-sm dark:border-navy-800/60">
              <span>
                {p.label} ({p.kind})
              </span>
              <button
                className="text-xs text-accent-600 underline"
                onClick={() => setSelectedProviderId(p.id)}
                type="button"
              >
                เพิ่มโมเดลให้ provider นี้
              </button>
            </div>
          ))}
        </div>

        {selectedProviderId && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addModel.mutate({ providerId: selectedProviderId, modelId, label: modelLabel, isDefault: models.length === 0 });
            }}
            className="grid grid-cols-1 gap-3 md:grid-cols-3"
          >
            <Input placeholder="Model ID เช่น claude-sonnet-5" value={modelId} onChange={(e) => setModelId(e.target.value)} required />
            <Input placeholder="ชื่อแสดงผล" value={modelLabel} onChange={(e) => setModelLabel(e.target.value)} required />
            <Button type="submit" disabled={addModel.isPending}>
              เพิ่มโมเดล
            </Button>
          </form>
        )}

        <div className="space-y-2">
          {models.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2 text-sm dark:border-navy-800/60">
              <span>
                {m.label} — {m.modelId} {m.isDefault && <span className="text-accent-600">(ค่าเริ่มต้น)</span>}
              </span>
              <Button size="sm" variant="secondary" onClick={() => setActive.mutate({ modelId: m.id })}>
                ใช้งานโมเดลนี้
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : undefined}>
      <label className="mb-1 block text-sm font-medium text-navy-900 dark:text-slate-200">{label}</label>
      {children}
    </div>
  );
}
