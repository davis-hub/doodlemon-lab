// /api/generate — turns an uploaded pfp into an original Doodlemon companion.
// Needs env var GEMINI_API_KEY (free key from aistudio.google.com).
// Model: gemini-2.5-flash-image (free API tier, no visible watermark).

const MODEL = "gemini-2.5-flash-image";

const STYLE_RECIPE = `Redraw the uploaded profile picture in "Doodlemon" art style — the SAME character, same pose, same framing, fully restyled.

RULES:
- This is a style transformation, not a new character. Side by side with the original, it must clearly be the same pfp.
- Keep: the subject's identity, pose, framing/composition, color palette, expression, and all accessories (hat, glasses, jewelry, headphones, clothing, markings).
- Restyle everything into cute doodle form: simplified rounded shapes, slightly chibi softness, thick clean dark outlines, flat pastel candy colors with soft rainbow/iridescent accents.
- Eyes become big and simple (small sparkle eyes or large white circles with black pupils), matching the original expression.
- Background becomes a dreamy pastel version of the original background (or soft pastel clouds/bubbles if the original background is plain), with small white sparkles and stars.
- Do NOT reproduce any existing Pokemon or other copyrighted character design.

ART STYLE (follow exactly):
- Cute pastel candy palette with soft rainbow/iridescent accents
- Thick clean dark outlines, soft rounded squishy shapes
- Big simple expressive eyes (either small sparkle eyes or large white circles with black pupils)
- Small white sparkles and stars scattered in the scene
- The creature sits in its own dreamy mini-habitat that matches the pfp's vibe (e.g. bubble sky, flower garden, neon arcade, cozy desert) drawn in the same pastel style
- Flat sticker-like illustration, no photorealism, no text, no watermark, no logo
- Square composition, creature centered`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server missing GEMINI_API_KEY" });
  }

  try {
    const { image, mimeType } = req.body || {};
    if (!image || !mimeType) {
      return res.status(400).json({ error: "Missing image" });
    }
    // ~1.4MB base64 cap (client resizes to 512px so this is generous)
    if (image.length > 1_400_000) {
      return res.status(413).json({ error: "Image too large" });
    }
    if (!/^image\/(png|jpeg|webp)$/.test(mimeType)) {
      return res.status(400).json({ error: "Unsupported image type" });
    }

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: mimeType, data: image } },
                { text: STYLE_RECIPE },
              ],
            },
          ],
        }),
      }
    );

    if (r.status === 429) {
      return res.status(429).json({
        error: "Daily catch limit reached! The Doodlemon are resting — come back tomorrow.",
      });
    }
    if (!r.ok) {
      const detail = await r.text();
      console.error("Gemini error:", r.status, detail.slice(0, 500));
      return res.status(502).json({ error: "Generation failed, try again." });
    }

    const data = await r.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
    const out = imgPart?.inlineData || imgPart?.inline_data;

    if (!out?.data) {
      return res.status(502).json({ error: "No image returned, try again." });
    }

    return res.status(200).json({
      image: out.data,
      mimeType: out.mimeType || out.mime_type || "image/png",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Something went wrong, try again." });
  }
}
