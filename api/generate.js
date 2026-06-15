// /api/generate — Turns an uploaded pfp into a NEW original "Doodlemon" creature
// in a flat 2D cozy cartoon style (Doodles / Pokemon-illustration look).
// Provider: NanoGPT (crypto-funded). Needs env var NANOGPT_API_KEY.

const ENDPOINT = "https://nano-gpt.com/api/v1/images/generations";
import { sbConfigured, handleExists, uploadImage, insertEntry } from "./_supabase.js";
const MODEL = "nano-banana"; // Gemini 2.5 Flash Image

// Always-on rules: invent a NEW creature, flat 2D cartoon style.
const BASE = `Redraw the character from the uploaded profile picture as a full-body "Doodlemon" in a cute cartoon style.

KEEP THE SAME CHARACTER (important): same species/animal, same exact colors and skin/fur, same markings and patterns, same face, same eye color, and ALL the same accessories and outfit (hat, glasses, jewelry, chain, collar, clothing). It must clearly be the SAME character from the pfp — do not change its colors, do not turn it into a different creature.

GIVE IT A FULL BODY (important): the pfp may only show the head or upper body, so naturally extend it into a complete, correctly-proportioned full-body character — exactly ONE head, TWO arms, TWO legs, standing upright in a cute relaxed pose. Proportions should be chibi/cartoon-cute (slightly big head, small rounded body), anatomy clean and correct, no extra or missing limbs.

ART STYLE (follow exactly, every time): polished 2D cartoon mascot illustration in a clean, professional Doodles style. Bold even dark outlines of consistent weight. Smooth cel-shading with soft gradient shadows and subtle highlights giving gentle volume (NOT flat single-tone coloring, NOT a flat sticker). Rich warm coloring. Cute rounded chibi proportions with a slightly larger head and small sturdy body, big expressive eyes with a small shine. Confident, finished, high-quality linework. NOT 3D, not a plush toy, not a photo, not pixel art, not a flat sticker, not rough sketchy lines. Square composition, no text, no watermark, no logo.`;

const VIBE = [
  "standing in a cute relaxed pose",
  "standing with a happy little wave",
  "standing with hands on hips, confident",
  "standing with arms spread wide, joyful",
  "walking mid-step with a cheerful stride",
  "running playfully with arms out",
  "jumping in the air with excitement",
  "sitting cutely with legs tucked",
  "sitting cross-legged, relaxed",
  "lying on its belly, kicking feet up, cozy",
  "crouching down curiously looking at something",
  "doing a little dance with arms up",
  "stretching happily with arms overhead",
  "giving a thumbs up to the viewer",
  "holding a single flower, admiring it",
  "peeking out shyly with hands near face",
  "leaping forward joyfully",
  "standing on tiptoes reaching upward",
  "sitting on a small rock, legs dangling",
  "striking a cute heroic victory pose",
  "looking back over its shoulder playfully",
  "twirling around cheerfully",
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
    const { image, mimeType, handle } = req.body || {};
    if (!image || !mimeType) return res.status(400).json({ error: "Missing image" });
    if (image.length > 4_000_000) return res.status(413).json({ error: "Image too large" });
    if (!/^image\/(png|jpeg|webp)$/.test(mimeType))
      return res.status(400).json({ error: "Unsupported image type" });

    // Normalize X handle and enforce one generation per handle.
    const h = String(handle || "").trim().replace(/^@+/, "").toLowerCase();
    console.log("generate: received handle =", JSON.stringify(handle), "-> normalized =", JSON.stringify(h));
    if (!/^[a-z0-9_]{1,15}$/.test(h)) {
      console.error("rejected handle:", JSON.stringify(h), "len", h.length);
      return res.status(400).json({ error: "Enter a valid X handle (letters, numbers, underscore)." });
    }

    if (sbConfigured()) {
      try {
        if (await handleExists(h))
          return res.status(409).json({ error: "@" + h + " already caught their Doodlemon! One per trainer." });
      } catch (e) {
        console.error("handle check failed:", e);
        // If the check fails, fail safe by blocking rather than allowing infinite spend.
        return res.status(503).json({ error: "Couldn't verify your handle, try again in a moment." });
      }
    }

    const prompt =
      `${BASE} POSE & EXPRESSION: First read the facial expression and mood of the character in the uploaded picture (e.g. cool, grumpy, happy, sleepy, smug, shy, excited, serious, mischievous). Give the full-body Doodlemon a pose and body language that MATCHES that same mood, and keep the same facial expression on its face. For example: a cool/smug pfp gets a confident hands-on-hips or arms-crossed pose; a happy pfp gets a cheerful wave or jump; a sleepy pfp gets a relaxed sitting or yawning pose; a grumpy pfp gets a sulky crossed-arms pose. The pose must feel natural for that personality. ` +
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
        strength: 0.72,
        guidance_scale: 11,
        num_inference_steps: 32,
        negative_prompt:
          "flat sticker, flat single-tone coloring, no shading, sketchy lines, rough lines, inconsistent line weight, pixel art, four legs, all fours, quadruped, extra limbs, extra arms, extra legs, multiple tails, deformed anatomy, fused limbs, 3D render, plush toy, claymation, photorealistic, realistic, glossy plastic, vinyl figure, blurry, low quality, wrong colors, text, watermark, signature",
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

    // Normalize the result to base64 + mime regardless of response shape.
    let outB64 = null, outMime = "image/png";
    if (item?.b64_json) {
      outB64 = item.b64_json;
    } else if (item?.url) {
      const imgRes = await fetch(item.url);
      if (!imgRes.ok) throw new Error("Failed to fetch generated image");
      const buf = Buffer.from(await imgRes.arrayBuffer());
      outMime = imgRes.headers.get("content-type") || "image/png";
      outB64 = buf.toString("base64");
    }

    if (!outB64) {
      console.error("Unexpected NanoGPT response:", JSON.stringify(data).slice(0, 800));
      return res.status(502).json({ error: "No image returned, try again." });
    }

    // Save to gallery (pending approval) + record the handle so it's one-per-user.
    if (sbConfigured()) {
      try {
        const publicUrl = await uploadImage(h, outB64, outMime);
        await insertEntry(h, publicUrl);
      } catch (e) {
        console.error("save failed:", e);
        // Still return the image to the user even if saving hiccups.
      }
    }

    return res.status(200).json({ image: outB64, mimeType: outMime });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Something went wrong, try again." });
  }
}
