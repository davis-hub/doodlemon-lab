// Tiny Supabase REST helper for serverless functions (service key, bypasses RLS).
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

function headers(extra = {}) {
  return { apikey: KEY, Authorization: `Bearer ${KEY}`, ...extra };
}

export function sbConfigured() {
  return Boolean(URL && KEY);
}

// Check if a handle already exists.
export async function handleExists(handle) {
  const r = await fetch(
    `${URL}/rest/v1/doodlemons?handle=eq.${encodeURIComponent(handle)}&select=handle`,
    { headers: headers() }
  );
  if (!r.ok) throw new Error("db check failed");
  const rows = await r.json();
  return rows.length > 0;
}

// Upload a base64 image to the public bucket; return its public URL.
export async function uploadImage(handle, base64, mime) {
  const ext = mime === "image/jpeg" ? "jpg" : "png";
  const path = `${Date.now()}-${handle.replace(/[^a-z0-9_]/gi, "")}.${ext}`;
  const bytes = Buffer.from(base64, "base64");
  const r = await fetch(`${URL}/storage/v1/object/doodlemons/${path}`, {
    method: "POST",
    headers: headers({ "Content-Type": mime, "x-upsert": "true" }),
    body: bytes,
  });
  if (!r.ok) throw new Error("upload failed: " + (await r.text()).slice(0, 200));
  return `${URL}/storage/v1/object/public/doodlemons/${path}`;
}

// Insert a pending (unapproved) entry.
export async function insertEntry(handle, imageUrl) {
  const r = await fetch(`${URL}/rest/v1/doodlemons`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ handle, image_url: imageUrl, approved: false }),
  });
  if (!r.ok) throw new Error("insert failed: " + (await r.text()).slice(0, 200));
}

// List approved entries for the gallery.
export async function listApproved(limit = 200) {
  const r = await fetch(
    `${URL}/rest/v1/doodlemons?approved=eq.true&select=handle,image_url,created_at&order=created_at.desc&limit=${limit}`,
    { headers: headers() }
  );
  if (!r.ok) throw new Error("list failed");
  return r.json();
}

// List pending entries for the admin page.
export async function listPending(limit = 200) {
  const r = await fetch(
    `${URL}/rest/v1/doodlemons?approved=eq.false&select=id,handle,image_url,created_at&order=created_at.desc&limit=${limit}`,
    { headers: headers() }
  );
  if (!r.ok) throw new Error("list failed");
  return r.json();
}

// Approve or delete an entry by id.
export async function setApproved(id, approved) {
  const r = await fetch(`${URL}/rest/v1/doodlemons?id=eq.${id}`, {
    method: "PATCH",
    headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ approved }),
  });
  if (!r.ok) throw new Error("update failed");
}
export async function deleteEntry(id) {
  const r = await fetch(`${URL}/rest/v1/doodlemons?id=eq.${id}`, {
    method: "DELETE",
    headers: headers({ Prefer: "return=minimal" }),
  });
  if (!r.ok) throw new Error("delete failed");
}
