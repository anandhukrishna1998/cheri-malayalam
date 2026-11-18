# Chéri Malayalam

A Progressive Web App (PWA) that teaches spoken Kerala Malayalam to a French speaker, written in Manglish (with optional Malayalam script). It installs on iPhone and Android like a native app, works offline, and needs no account.

**What's in it:**
- **4 sections, 24 units, 104 path steps** (80 lessons + 24 end-of-unit challenges):
  1. *Les bases* (6 units)
  2. *La vie de tous les jours* (6 units)
  3. *Parler comme au Kerala* (6 units)
  4. *La vie à deux au Kerala* (6 units)
- **135 verbs** with 4 forms each (present, past, future, negative)
- **13 dialogues** (81 lines) with role-play practice
- **872-word dictionary** across 17 categories (plus 72 place forms and 32 feeling expressions)
- **612-sentence phrasebook** across 35 everyday topics
- **2,378 phrases & words with audio** (~28 MB of MP3 recordings)

**Screens:**
- **Apprendre:** the lesson path through Kerala, with cultural/grammar tips for each unit, a pronunciation guide, and an end-of-unit challenge.
- **Dialogues:** listen to a conversation line by line or all at once, then play your role.
- **Entraînement:** daily review (spaced repetition), "Mes erreurs", listening only, verb drills, and a 60-second challenge.
- **Traduire:** offline French ↔ Manglish translator (exact matches, verb tables, phrasebook, word-by-word sentence building) with optional AI translation + AI voice, plus the full lexicon with favourites.
- **Profil:** XP, streak, weekly chart, Kerala route levels, 9 real-life rewards, badges, settings (theme, script toggle, daily goal), and JSON backup/restore.

## Install on a phone & use offline (PWA)

Chéri Malayalam is a **Progressive Web App** (`public/manifest.webmanifest` + `public/sw.js` service worker). Once deployed to an HTTPS URL (see below), anyone can install it without the App Store or Play Store:

- **iPhone / iPad (Safari):**
  1. Open the deployed site URL in **Safari**.
  2. Tap the **Share** button (square with an up arrow).
  3. Tap **Add to Home Screen** (*Sur l'écran d'accueil*) → **Add**.
  4. Open the **Malayalam** icon on the Home Screen — it runs full-screen like a native app.
- **Android (Chrome):** open the URL in Chrome and tap **Install app** (*Installer l'application*) in the banner or menu.

**How offline mode works:**
- **Works fully offline** (after opening the app once while online): the entire app interface, all 4 sections / 24 units / 104 steps, 135 verbs, 13 dialogues, 872-word dictionary, 612-sentence phrasebook, offline French ↔ Manglish translator, and all saved progress (`localStorage`).
- **Audio offline:** audio MP3s are cached on the phone automatically as you open lessons and play phrases (they are not all downloaded upfront to keep the first load fast). Any lesson or phrase already opened while online will play offline; audio from lessons never opened online yet will need a connection the first time.
- **AI translation & AI voice:** translating a brand-new sentence with AI (`/api/translate`) and reading it aloud (`/api/tts`) require internet the first time. Results (up to 150 translations) and their generated audio are then cached on the phone and work offline.

## Run it on your computer

```bash
npm install
npm run dev
```

## Put it online (Cloudflare)

The project is configured for **Cloudflare Workers with static assets** (`wrangler.jsonc` + `worker/index.ts`, which serves `./dist` and handles `/api/translate` and `/api/tts`). Cloudflare Pages (`functions/api/*.ts`) is also supported.

1. Log in to Cloudflare once: `npx wrangler login`
2. Deploy to Cloudflare Workers: `npm run deploy`
   *(Or deploy to Cloudflare Pages instead: `npm run deploy:pages`)*

You can also connect the GitHub repo in the Cloudflare dashboard (**Workers & Pages → Create**) with build command `npm run build` and output folder `dist`. `wrangler.jsonc` sets `"keep_vars": true` so dashboard secrets are preserved across deploys.

## AI translation & voice (optional)

The Traduire tab works offline for everything already in the app. For sentences the offline translator doesn't know, it asks an AI through `/api/translate` (`functions/api/translate.ts`, also routed by `worker/index.ts`), and `/api/tts` (`functions/api/tts.ts`) reads AI translations aloud with Gemini text-to-speech (free tier, same key) so they can be heard even on iPhones without a built-in Malayalam voice. Until a key is set, the app simply says AI translation isn't enabled.

It uses **Google Gemini's free tier** (`gemini-3.8-flash`) first. **Claude** is an optional paid backup, used only if Gemini fails or its free daily limit is reached.

1. Get a free Gemini key at [aistudio.google.com](https://aistudio.google.com) → Get API key (no card needed).
2. In the Cloudflare dashboard, open your Worker or Pages project → **Settings → Variables and Secrets** and add, each as type **Secret**:
   - `GEMINI_API_KEY`: the Gemini key.
   - `TRANSLATE_CODE` (recommended): any word you choose. The app asks for it once, so strangers who find the site can't use up your quota.
   - `ANTHROPIC_API_KEY` (optional backup): a key from [console.anthropic.com](https://console.anthropic.com). Set a monthly spend limit there.
3. Deploy again (push to GitHub, or `npm run deploy`).

Good to know:
- On Gemini's free tier, Google may use the sentences sent to improve its products.
- Free-tier limits are set by Google and change from time to time. When the limit is reached, the app says to try again later (or uses Claude, if that key is set).
- Answers and generated AI audio are cached on the phone, so the same sentence is never sent twice. The keys stay on the server and never reach the phone.

**Test locally:** create a file `.dev.vars` (already git-ignored) containing `GEMINI_API_KEY=...`, then run `npm run build` and `npx wrangler dev` (or `npx wrangler pages dev dist` for Pages).

## Edit the content

| File | What it holds |
|---|---|
| `src/content/section1.json` … `section4.json` | 4 sections, 24 units, 80 lessons (+ 24 unit challenges), tips |
| `src/content/verbs.json` | 135 verbs and their 4 forms (present, past, future, negative) |
| `src/content/dialogues.json` | 13 dialogues (81 lines) and characters (`voice`: `f` or `m`) |
| `src/content/rewards.json` | 9 real-life rewards per level |
| `src/content/dictionary.json` | 872 single words in 17 categories (`[manglish, français, മലയാളം]`), plus 72 `places` (forms for « à » / « vers » a place) and 32 `feelings` (« j'ai faim » → Enikku vishakkunnu) |
| `src/content/phrasebook.json` | 612 ready-made everyday sentences across 35 topics (`[manglish, français, മലയാളം, note?]`). A sentence that already exists elsewhere adds its French wording as a search alias. |

A phrase can be written in short form:

```json
["Manglish", "Français", "മലയാളം", "optional cultural note"]
```

or in long form, when you want a custom id, hint, or accepted spellings:

```json
{ "id": "chaaya", "manglish": "Chaaya", "fr": "Thé", "ml": "ചായ", "hint": "TCHAA-ya", "accept": ["chaya"] }
```

- The id defaults to the Manglish in lowercase with dashes (`Ithu enthaanu?` → `ithu-enthaanu`). The audio file uses the same name.
- The French pronunciation hint is written automatically (`Kazhikkunnu` → `kazhikkounnou`) unless you give one.
- A lesson teaches verbs with `"verbs": ["kazhikkuka", "kudikkuka"], "forms": ["pres", "past"]`.

To see what the translator answers for some test sentences: `node scripts/try-translate.mjs`.

Run `npm run check` after editing. It catches duplicate ids, unknown verbs or characters, and phrases with no audio. `npm run build` runs it too.

## Audio

- `npm run audio` creates `public/audio/<id>.mp3` for every phrase that has no audio yet, using free Microsoft Malayalam neural voices (`ml-IN-SobhanaNeural` / `ml-IN-MidhunNeural`). Dialogue lines use a male or female voice depending on the character.
- **Your own voice:** record a phrase, save it as MP3 named `<id>.mp3` in `public/audio/` (replacing the generated file), and deploy again. Your recordings are never overwritten.

## Progress and backup

Progress is saved locally on the device only (`localStorage`). **Profil → Sauvegarde** downloads a JSON backup file, which can be restored on another phone (or after clearing browser data).
