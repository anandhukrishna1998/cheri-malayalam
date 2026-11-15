# Chéri Malayalam

A web app that teaches Malayalam to a French speaker, written entirely in Manglish. It installs on a phone like an app, works offline, and needs no account or server.

**What's in it:** 3 sections, 18 units, 80 lessons, 36 verbs (present, past, future, negative), 10 dialogues and 478 phrases, all with audio.

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

## Edit the content

| File | What it holds |
|---|---|
| `src/content/section1.json`, `section2.json`, `section3.json` | Units, lessons, tips |
| `src/content/verbs.json` | The 36 verbs and their 4 forms |
| `src/content/dialogues.json` | Dialogues and characters (`voice`: `f` or `m`) |
| `src/content/rewards.json` | Real-life rewards per level |
| `src/content/dictionary.json` | Single words for the translator, by category: `[manglish, français, മലയാളം]` |

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
