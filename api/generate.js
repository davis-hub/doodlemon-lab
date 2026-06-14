// /api/generate — Turns an uploaded pfp into a NEW original "Doodlemon" creature
// in a flat 2D cozy cartoon style (Doodles / Pokemon-illustration look).
// Provider: NanoGPT (crypto-funded). Needs env var NANOGPT_API_KEY.

const ENDPOINT = "https://nano-gpt.com/api/v1/images/generations";
const MODEL = "nano-banana"; // Gemini 2.5 Flash Image

// Always-on rules: invent a NEW creature, flat 2D cartoon style.
const BASE = `Look at the uploaded profile picture and design ONE original cute mascot creature ("Doodlemon") based on it.

CARRY OVER FROM THE PFP (important): the creature must clearly use the pfp's dominant colors as its OWN body/skin colors, its main fur/skin markings or patterns, and its signature accessories and outfit (hat, glasses, jewelry, chain, collar, clothing). Someone seeing them side by side should think "that creature is based on that pfp." It is a NEW creature, not a redraw, but the color scheme, markings and outfit must match the pfp — do not invent unrelated colors.

BODY PLAN (strict): exactly ONE head, TWO arms, and TWO legs. The creature stands upright on two legs like a cute mascot. Do NOT give it four legs, extra limbs, or animal all-fours posture. Keep the body simple, round and chibi.

ART STYLE (very important): flat 2D cartoon illustration, clean bold dark outlines, smooth soft cel-shading, cozy warm pastel coloring, simple rounded friendly shapes, big expressive cartoon eyes. Wholesome storybook / sticker vibe. NOT 3D, not a render, not a plush toy, not a photo. The creature must NOT be any existing Pokemon or copyrighted character. Square composition, no text, no watermark, no logo.`;

const VIBE = [
  "tiny round fluffy upright creature, super cute and cozy",
  "small chubby upright creature with short arms and legs",
  "cute upright critter with big ears and a little tail",
  "round upright blob-shaped creature with stubby arms and legs",
  "small upright dragon-like creature with tiny wings",
  "soft upright kitten-like creature with a curly tail",
  "small upright creature with a cute rounded shell on its back",
  "little upright creature with round cheeks and tiny wings",
];

const SETTING = [
  "a flowery meadow", "a cozy cottage garden", "a vast field of wildflowers",
  "a grassy hilltop", "a sunny sandy beach", "an open sky above the clouds",
  "a clear shallow lagoon", "a tranquil lily pond", "a snowy village",
  "an autumn forest path", "a cherry-blossom park", "a glowing enchanted forest",
  "a whimsical candy land", "a hilltop picnic spot", "a desert oasis",
  "a misty mountain valley", "a coral reef underwater", "a rooftop garden over a pastel city",
  "an autumn pumpkin patch", "a bamboo forest", "a floating sky island",
  "a riverside willow grove", "a mushroom-dotted glade", "a seaside cliff with a lighthouse",
];

const TIME = [
  "at golden sunset", "at soft sunrise", "under a bright midday sky",
  "under a deep starry night", "in dreamy twilight", "on a warm golden afternoon",
  "under a pastel dawn", "beneath a glowing full moon",
];

const WEATHER = [
  "clear skies with fluffy clouds", "a soft drifting mist",
  "gentle falling snow", "drifting flower petals on the breeze",
  "a few floating bubbles in the air", "warm sun rays breaking through",
  "a light sprinkle of rain and a faint rainbow", "calm still air with sparkles",
];

const FOREGROUND = [
  "big colorful daisies and grass tufts in front", "smooth rocks and tide pools up close",
  "little glowing mushrooms in the foreground", "clusters of tulips and clover up front",
  "lily pads and reeds in front", "scattered autumn leaves up close",
  "tiny wildflowers and pebbles in front", "soft snow drifts in the foreground",
  "a wooden fence and a little wheelbarrow nearby", "a checkered picnic blanket and basket up front",
];

const BACKDROP = [
  "a winding blue river and rolling hills behind", "layered round cartoon trees in the distance",
  "tall snow-capped mountains far back", "a calm sea and a small island on the horizon",
  "soft distant hills under the sky", "a cozy little house on a wooden dock behind",
  "a faraway pastel village", "a gentle waterfall and cliffs in the distance",
  "a big setting sun glowing on the horizon", "drifting clouds and floating far-off islands",
];

const EXTRA = [
  "fluttering pastel butterflies", "twinkling fireflies", "shooting stars overhead",
  "little birds gliding by", "floating sparkles and petals", "tiny hearts drifting up",
  "a friendly dragonfly", "soft glowing dust motes",
];

const PALETTE = [
  "warm cozy pastels, soft and inviting",
  "bright cheerful candy colors",
  "soft cotton-candy pink and sky-blue tones",
  "sunny golden and peach tones",
  "fresh green and sky-blue tones",
  "dreamy lilac and pink twilight tones",
];

const MOOD = [
  "happy and playful",
  "sleepy and peaceful",
  "curious and wide-eyed",
  "shy and sweet",
  "excited and energetic",
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

    const prompt =
      `${BASE} The creature is a ${pick(VIBE)}, ${pick(MOOD)}. ` +
      `Color palette: ${pick(PALETTE)}. ` +
      `Render a rich, detailed, fully-illustrated background with clear foreground, midground and background layers — not an empty backdrop. ` +
      `Scene: ${pick(SETTING)} ${pick(TIME)}, ${pick(WEATHER)}; ${pick(FOREGROUND)}, ${pick(BACKDROP)}, with ${pick(EXTRA)}.`;

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
        strength: 0.8,
        guidance_scale: 10,
        num_inference_steps: 32,
        negative_prompt:
          "four legs, all fours, quadruped, extra limbs, extra arms, extra legs, multiple tails, deformed anatomy, fused limbs, 3D render, plush toy, claymation, photorealistic, realistic, glossy plastic, vinyl figure, blurry, low quality, wrong colors, text, watermark, signature",
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
