// /api/generate — Doodlefies an uploaded pfp via NanoGPT (crypto-funded).
// Needs env var NANOGPT_API_KEY from nano-gpt.com.
// Endpoint: OpenAI-compatible images/generations with image input (image edit).

const ENDPOINT = "https://nano-gpt.com/api/v1/images/generations";
const MODEL = "nano-banana"; // Gemini 2.5 Flash Image — the glossy plush look

const STYLE_RECIPE = `Redraw the person/character in this image in the "Doodlemon" art style. Keep it clearly recognizable as the same subject — same pose, same face/character, same colors, same accessories (hat, glasses, hair, jewelry, clothing, markings).

Restyle into a soft, glossy, plush 3D-render look: cute rounded squishy forms, smooth shiny highlights, big simple sparkly eyes, thick soft outlines, pastel candy color palette with rainbow iridescent accents. Place the subject in a dreamy pastel habitat — soft clouds, soap bubbles, sparkles and stars, or a lush pastel flower garden — with gentle depth and soft lighting. Square composition, no text, no watermark, no logo.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const apiKey = process.env.NANOGPT_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Server missing NANOGPT_API_KEY" });

  try {
    const { image, mimeType } = req.body || {};
    if (!image || !mimeType) return res.status(400).json({ error: "Missing image" });
    if (image.length > 1_400_000) return res.status(413).json({ error: "Image too large" });
    if (!/^image\/(png|jpeg|webp)$/.test(mimeType))
      return res.status(400).json({ error: "Unsupported image type" });

    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: STYLE_RECIPE,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
        imageDataUrl: `data:${mimeType};base64,${image}`,
        strength: 0.72,
      }),
    });

    if (r.status === 429)
      return res.status(429).json({ error: "Lots of catches right now — try again in a minute." });
    if (r.status === 402)
      return res.status(502).json({ error: "Out of credits for now — check back soon." });
    if (!r.ok) {
      const detail = await r.text();
      console.error("NanoGPT error:", r.status, detail.slice(0, 800));
      return res.status(502).json({ error: "Generation failed, try again." });
    }

    const data = await r.json();
    const item = data?.data?.[0] || null;

    if (item?.b64_json) {
      return res.status(200).json({ image: item.b64_json, mimeType: "image/png" });
    }
    if (item?.url) {
      const imgRes = await fetch(item.url);
      if (!imgRes.ok) throw new Error("Failed to fetch generated image");
      const buf = Buffer.from(await imgRes.arrayBuffer());
      const outMime = imgRes.headers.get("content-type") || "image/png";
      return res.status(200).json({ image: buf.toString("base64"), mimeType: outMime });
    }

    console.error("Unexpected NanoGPT response:", JSON.stringify(data).slice(0, 800));
    return res.status(502).json({ error: "No image returned, try again." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Something went wrong, try again." });
  }
}
