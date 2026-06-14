// /api/generate — Doodlefies an uploaded pfp via NanoGPT (crypto-funded).
// Needs env var NANOGPT_API_KEY from nano-gpt.com.
// Each call procedurally MIXES style building blocks so (almost) every
// result is a unique combination, while staying on-brand "Doodlemon".

const ENDPOINT = "https://nano-gpt.com/api/v1/images/generations";
const MODEL = "nano-banana"; // Gemini 2.5 Flash Image — glossy plush look

// Always-on identity rules so the subject stays recognizable, but the ART STYLE
// must be fully replaced — do not preserve the source's flat/anime/line-art look.
const BASE = `Completely re-render the subject in this image as an adorable soft 3D "Doodlemon" creature. Keep the same character identity — same species/animal, same colors, same key accessories (hat, glasses, hair, jewelry, chain, clothing, markings) — so it's recognizable as the same character. BUT fully discard the original art style: do NOT keep any flat anime, cartoon, or line-art look. Re-sculpt it as a cute rounded plushie-like 3D character with big simple sparkly eyes and a soft friendly expression, in the style of a soft pastel collectible toy. Square composition, no text, no watermark, no logo.`;

// --- Style building blocks -------------------------------------------------
// RENDER weighted toward the glossy-3D "hero" DNA so it always reads Doodlemon.
const RENDER = [
  "soft glossy 3D render, rounded squishy plush forms, smooth shiny highlights",
  "soft glossy 3D render, rounded squishy plush forms, smooth shiny highlights",
  "soft glossy 3D render, rounded squishy plush forms, smooth shiny highlights",
  "soft glossy 3D render, rounded squishy plush forms, smooth shiny highlights",
  "dreamy 3D claymation, matte soft clay textures, chunky rounded forms",
  "glossy holographic 3D, iridescent pearlescent surfaces, soft inner glow",
  "soft plush toy / felt fabric look, fuzzy texture, subtle stitching, button eyes",
  "kawaii chibi 3D, oversized head, tiny body, huge shiny eyes, glossy shading",
  "smooth vinyl designer-toy 3D, matte finish, clean rounded sculpt",
];

const PALETTE = [
  "pastel candy palette with rainbow iridescent accents",
  "cotton-candy pink and baby-blue palette",
  "mint, lavender and butter-yellow pastel palette",
  "peach and lavender sunset pastels",
  "soft holographic pearl palette, pale pink-blue-violet sheen",
  "dreamy lilac and sky-blue palette with gold sparkle accents",
  "creamy vanilla and strawberry pastel palette",
  "soft seafoam, coral and pale gold palette",
];

const HABITAT = [
  "floating inside a giant iridescent soap bubble in a soft blue sky with puffy pastel clouds",
  "in a lush pastel flower garden with big soft balloon-like 3D flowers and gentle sunlight",
  "in a dreamy pastel galaxy with glowing stars and a soft pastel moon",
  "on fluffy cotton-candy clouds in pink and blue with floating bubbles",
  "in a cozy pastel meadow at golden hour with soft rolling hills",
  "in a soft pastel snowy wonderland with gentle falling snow and frosted trees",
  "in a calm pastel seaside with soft foamy waves and tiny shells",
  "in a magical pastel forest clearing with glowing mushrooms and fireflies",
  "against a simple dreamy pastel gradient sky with cute clouds",
];

const ACCENT = [
  "scattered white sparkles and tiny stars",
  "soft glitter and twinkling sparkles",
  "drifting little bubbles and sparkles",
  "gentle bokeh light and sparkles",
  "tiny floating hearts and sparkles",
  "soft glowing dust motes and sparkles",
];

const LIGHT = [
  "soft diffused lighting, gentle depth of field",
  "warm soft glow, dreamy soft focus background",
  "bright airy lighting, clean soft shadows",
  "soft rim light with a cozy ambient glow",
];

const pick = (a) => a[Math.floor(Math.random() * a.length)];

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

    // Mix one block from each bucket → ~10*8*9*6*4 = 17,000+ combinations.
    const prompt =
      `${BASE} Style: ${pick(RENDER)}, ${pick(PALETTE)}. ` +
      `Setting: ${pick(HABITAT)}, with ${pick(ACCENT)}. ${pick(LIGHT)}.`;

    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
        imageDataUrl: `data:${mimeType};base64,${image}`,
        strength: 0.85,
        guidance_scale: 9,
        num_inference_steps: 34,
        negative_prompt:
          "flat anime, 2D cartoon, line art, cel shading, original art style preserved, sketch, manga, comic, sticker, harsh outlines, photorealistic human",
        seed: Math.floor(Math.random() * 1e9),
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
