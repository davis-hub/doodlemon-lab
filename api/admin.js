// /api/admin — list pending, approve, or delete. Protected by ADMIN_PASSWORD.
import { sbConfigured, listPending, setApproved, deleteEntry } from "./_supabase.js";

export default async function handler(req, res) {
  if (!sbConfigured()) return res.status(500).json({ error: "DB not configured" });

  const pass = req.headers["x-admin-pass"] || (req.body && req.body.pass) || req.query.pass;
  if (!process.env.ADMIN_PASSWORD || pass !== process.env.ADMIN_PASSWORD)
    return res.status(401).json({ error: "Unauthorized" });

  try {
    if (req.method === "GET") {
      const items = await listPending(200);
      return res.status(200).json({ items });
    }
    if (req.method === "POST") {
      const { id, action } = req.body || {};
      if (!id || !action) return res.status(400).json({ error: "Missing id/action" });
      if (action === "approve") await setApproved(id, true);
      else if (action === "reject") await deleteEntry(id);
      else return res.status(400).json({ error: "Bad action" });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Admin action failed." });
  }
}
