import { getSetting, SETTINGS_KEYS } from "../services/settings.js";

export interface LiffIdTokenPayload {
  sub: string; // LINE userId
  name?: string;
  picture?: string;
  aud: string;
  exp: number;
  iss: string;
}

/**
 * Verifies a LIFF ID token server-side against LINE's token endpoint (rather than trusting
 * whatever the client claims), so an anonymous /liff/book submission can't forge a LINE userId.
 * https://developers.line.biz/en/reference/line-login/#verify-id-token
 */
export async function verifyLiffIdToken(idToken: string): Promise<LiffIdTokenPayload> {
  const channelId = await getSetting<string>(SETTINGS_KEYS.LIFF_CHANNEL_ID);
  if (!channelId) {
    throw new Error("LIFF channel ID is not configured. Set it in Settings before accepting LIFF bookings.");
  }

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Invalid LIFF ID token: ${res.status} ${body}`);
  }

  return (await res.json()) as LiffIdTokenPayload;
}
