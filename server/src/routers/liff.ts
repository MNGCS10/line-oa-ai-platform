import { router, publicProcedure } from "../trpc/trpc.js";
import { getSetting, SETTINGS_KEYS } from "../services/settings.js";

export const liffRouter = router({
  // liffId is a public app identifier (required by the LIFF SDK's liff.init() in the browser),
  // not a secret — unlike the LINE channel token/secret it's safe to expose here.
  getConfig: publicProcedure.query(async () => {
    const liffId = await getSetting<string>(SETTINGS_KEYS.LIFF_ID);
    return { liffId };
  }),
});
