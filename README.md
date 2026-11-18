# Chéri Malayalam

A web app that teaches Malayalam to a French speaker, written entirely in Manglish. It installs on a phone like an app, works offline, and needs no account or server.

**What's in it:** 4 sections, 24 units, 104 lessons, 135 verbs (present, past, future, negative), 13 dialogues, a ~870-word dictionary and a ~600-sentence phrasebook, all with audio.

**Screens:**
- **Apprendre:** the lesson path through Kerala, with tips for each unit and an end-of-unit challenge.
- **Dialogues:** listen to a conversation, then play your role.
- **Entraînement:** daily review (spaced repetition), "Mes erreurs", listening only, verb drills and a 60-second challenge.
- **Traduire:** offline French ↔ Manglish translator (phrases, verb tables, word-by-word sentence building) and the lexicon with favourites.
- **Profil:** XP, streak, weekly chart, levels, rewards, badges, settings and backup.

## Run it on your computer

```bash
npm install
npm run dev
```

## Put it online (Cloudflare Pages)

1. Log in to Cloudflare once: `npx wrangler login`
2. Deploy: `npm run deploy`

Or connect the GitHub repo in the Cloudflare dashboard (Workers & Pages → Create → Pages) with build command `npm run build` and output folder `dist`.

On an iPhone, open the link in Safari, tap Share, then "Sur l'écran d'accueil". On Android, Chrome offers "Installer l'application".

## AI translation (optional)

The Traduire tab works offline for everything already in the app. AI translations can also be heard: `functions/api/tts.ts` reads them aloud with Gemini text-to-speech (free tier, same key), and the phone keeps each one after the first time. For other sentences it asks an AI through a small server function (`functions/api/translate.ts`), which Cloudflare Pages deploys automatically. Until a key is set, the app simply says AI translation isn't enabled.

It uses **Google Gemini's free tier** (`gemini-3.8-flash`) first. **Claude** is an optional paid backup, used only if Gemini fails or its free daily limit is reached.

1. Get a free Gemini key at [aistudio.google.com](https://aistudio.google.com) → Get API key (no card needed).
2. In the Cloudflare dashboard, open your Pages project → **Settings → Variables and Secrets** and add, each as type **Secret**:
   - `GEMINI_API_KEY`: the Gemini key.
   - `TRANSLATE_CODE` (recommended): any word you choose. The app asks for it once, so strangers who find the site can't use up your quota.
   - `ANTHROPIC_API_KEY` (optional backup): a key from [console.anthropic.com](https://console.anthropic.com). Set a monthly spend limit there.
3. Deploy again (push to GitHub, or `npm run deploy`).

Good to know:
- On Gemini's free tier, Google may use the sentences sent to improve its products.
- Free-tier limits are set by Google and change from time to time. When the limit is reached, the app says to try again later (or uses Claude, if that key is set).
- Answers are cached on the phone, so the same sentence is never sent twice. The keys stay on the server and never reach the phone.

**Test locally:** create a file `.dev.vars` (already git-ignored) containing `GEMINI_API_KEY=...`, then run `npm run build` and `npx wrangler pages dev dist`.

## Edit the content

| File | What it holds |
|---|---|
| `src/content/section1.json` … `section4.json` | Units, lessons, tips |
| `src/content/verbs.json` | The 36 verbs and their 4 forms |
| `src/content/dialogues.json` | Dialogues and characters (`voice`: `f` or `m`) |
| `src/content/rewards.json` | Real-life rewards per level |
| `src/content/dictionary.json` | Single words for the translator, by category: `[manglish, français, മലയാളം]`; `places` (forms for « à » / « vers » a place) and `feelings` (« j'ai faim » → Enikku vishakkunnu) |
| `src/content/phrasebook.json` | Ready-made everyday sentences by topic, `[manglish, français, മലയാളം, note?]`. A sentence that already exists elsewhere just adds its French wording as another way to find it. |

A phrase can be written in short form:

```json
["Manglish", "Français", "മലയാളം", "optional cultural note"]
```

or in long form, when you want a custom id, hint, or accepted spellings:

```json
{ "id": "chaaya", "manglish": "Chaaya", "fr": "Thé", "ml": "ചായ", "hint": "TCHAA-ya", "accept": ["chaya"] }
```

- The id defaults to the Manglish in lowercase with dashes (`Ithu enthaanu?` → `ithu-enthaanu`). The audio file uses the same name.
- The French pronunciation hint is written automatically (Kazhikkunnu → kazhikkounnou) unless you give one.
- A lesson teaches verbs with `"verbs": ["kazhikkuka", "kudikkuka"], "forms": ["pres", "past"]`.

To see what the translator answers for some test sentences: `node scripts/try-translate.mjs`.

Run `npm run check` after editing. It catches duplicate ids, unknown verbs or characters, and phrases with no audio. `npm run build` runs it too.

## Audio

- `npm run audio` creates `public/audio/<id>.mp3` for every phrase that has no audio yet, using a free Microsoft Malayalam voice. Dialogue lines use a male or female voice depending on the character.
- **Your own voice:** record a phrase, save it as MP3 named `<id>.mp3` in `public/audio/` (replacing the generated file), and deploy again. Your recordings are never overwritten.

## Progress and backup

Progress is saved in the phone's browser only. Profil → Sauvegarde downloads a backup file, which can be restored on another phone.
