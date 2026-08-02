import { createDecipheriv } from "node:crypto";

const FEED_URL = process.env.FEED_URL;

const created = new Date();
console.log("Inicio monitoreo feed:", created.toISOString());

for (let i = 0; i < 9; i++) {
  try {
    const r = await fetch(FEED_URL);
    const t = await r.text();
    const ok = r.status === 200 && t.startsWith("BEGIN:VCALENDAR");
    console.log(
      `[t+${Math.round((Date.now() - created.getTime()) / 60000)}min]`,
      new Date().toISOString(),
      "->",
      r.status,
      ok ? "OK (ICS valido)" : t.slice(0, 80),
      ok ? `| ${(t.match(/BEGIN:VEVENT/g) || []).length} eventos` : ""
    );
    if (r.status !== 200) break;
  } catch (e) {
    console.log(`[t+${Math.round((Date.now() - created.getTime()) / 60000)}min] ERROR`, e.message);
    break;
  }
  if (i < 8) await new Promise((res) => setTimeout(res, 15 * 60 * 1000));
}
console.log("Fin del monitoreo del feed.");