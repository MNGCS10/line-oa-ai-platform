import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { lineUsers } from "../db/schema.js";
import { getLineUserProfile } from "../line/client.js";

export async function upsertLineUser(
  lineUserId: string,
  fallbackDisplayName?: string,
): Promise<typeof lineUsers.$inferSelect> {
  const [existing] = await db.select().from(lineUsers).where(eq(lineUsers.lineUserId, lineUserId)).limit(1);
  if (existing) return existing;

  let profile: { displayName?: string; pictureUrl?: string; statusMessage?: string } = {};
  try {
    profile = await getLineUserProfile(lineUserId);
  } catch {
    // Profile lookup is best-effort; proceed without it if the token isn't configured yet.
  }

  await db.insert(lineUsers).values({
    lineUserId,
    displayName: profile.displayName ?? fallbackDisplayName ?? lineUserId,
    pictureUrl: profile.pictureUrl,
    statusMessage: profile.statusMessage,
  });
  const [created] = await db.select().from(lineUsers).where(eq(lineUsers.lineUserId, lineUserId)).limit(1);
  return created;
}
