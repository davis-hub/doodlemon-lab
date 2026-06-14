// /api/gallery — returns approved Doodlemons for the public gallery.
import { sbConfigured, listApproved } from "./_supabase.js";

export default async function handler(req, res) {
  if (!sbConfigured()) return res.status(200).json({ items: [] });
  try {
    const items = await listApproved(200);
    return res.status(200).json({ items });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Could not load gallery." });
  }
}
