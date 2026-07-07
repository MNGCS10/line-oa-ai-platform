import { getSetting, SETTINGS_KEYS } from "./settings.js";
import { pushMessage, type LineMessage } from "../line/client.js";

export async function notifyOwner(messages: LineMessage[]): Promise<{ delivered: boolean; reason?: string }> {
  const ownerLineUserId = await getSetting<string>(SETTINGS_KEYS.OWNER_LINE_USER_ID);
  if (!ownerLineUserId) {
    return { delivered: false, reason: "owner_line_user_id not configured" };
  }
  await pushMessage(ownerLineUserId, messages);
  return { delivered: true };
}
