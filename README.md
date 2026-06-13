# Doodlemon Lab

Upload a pfp → get an original Doodlemon companion. Powered by the Gemini API (gemini-2.5-flash-image, free tier, no visible watermark).

## Deploy (GitHub → Vercel, same as LnF0)

1. Push these files to a new GitHub repo (keep the folder structure: `index.html` at root, `api/generate.js`).
2. Import the repo in Vercel — no framework, no build step needed. Vercel auto-detects `api/` as serverless functions.
3. Get a free API key at https://aistudio.google.com → "Get API key".
4. In Vercel → Project → Settings → Environment Variables, add:
   - `GEMINI_API_KEY` = your key
5. Deploy. Done.

## Notes

- Free tier caps requests per day (check your live quota in AI Studio). When it's hit, the site shows "Daily catch limit reached" automatically.
- Client resizes pfps to 512px before upload, so payloads stay small.
- The style recipe lives in `api/generate.js` (STYLE_RECIPE) — tweak wording there to tune the output.
- To upgrade quality later, change MODEL to a paid image model and enable billing on the key.
