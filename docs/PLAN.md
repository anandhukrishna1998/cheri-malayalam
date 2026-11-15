# "Chéri Malayalam" — French → Malayalam (Manglish) learning app

**Learner:** one person — native French speaker, complete beginner, cannot read Malayalam script.
**Teacher / content owner:** you (native Malayalam speaker).
**Bottom line:** Very doable. A small web app (PWA, installs on her phone like an app) with French instructions, Manglish-only Malayalam, your recorded voice, and light gamification. MVP in ~2–3 weekends.

---

## 1. Core design rules (non-negotiable)

1. **App language = French.** All buttons, hints, explanations in French. Malayalam always in Manglish + French translation.
2. **One fixed Manglish spelling scheme.** Manglish is messy (ente/ende, njan/nyan). Pick one spelling per word and stick to it; *accept* common variants when she types answers.
3. **Pronunciation hints written for a French ear.** French reads letters differently than English, so Manglish needs a cheat sheet:
   | Manglish | Sounds like (for French) | Example |
   |---|---|---|
   | u | **ou** (as in *vous*) | *kuttan* → "kouttane" |
   | e | **é** | *ente* → "énté" |
   | aa | long **a** | *vaa* (come) |
   | zh | between a French **r** and **l**, tongue curled | *kozhikode*, *pazham* |
   | th | soft **t** (tongue on teeth), no English "th" | *thaazhe* |
   | ch | **tch** | *chaaya* (tea) → "tchaaya" |
   | j | **dj** | *joli* (work) |
   | ng / nj | like *-gne* in *montagne* | *njaan* (I) |
4. **Audio is king.** She can't read the script, so every word/phrase needs sound. Best source: **you record it** (personal + correct Kerala accent). Fallback: Google TTS `ml-IN` — this reads Malayalam *script*, so the app stores the script internally (hidden by default) just to drive TTS.
5. **Couple-relevant content first.** Teach what she'll actually use with you and your family, not textbook filler.

---

## 2. Curriculum (MVP: 6 units, ~150 words/phrases)

| Unit | Theme | Sample phrases (Manglish → French) |
|---|---|---|
| 1 | Bonjour! Greetings | *Namaskaaram* → Bonjour · *Sukhamaano?* → Ça va ? · *Sukham* → Ça va bien |
| 2 | Moi & toi | *Njaan* → je · *Nee* → tu · *Ente peru ___* → Je m'appelle ___ |
| 3 | La famille (meeting his family!) | *Amma* → maman · *Achan* → papa · *Chettan / Chechi* → grand frère / sœur |
| 4 | À table (food) | *Bhakshanam kazhicho?* → Tu as mangé ? · *Chaaya* → thé · *Mathi* → assez · *Nalla ruchi!* → C'est délicieux ! |
| 5 | Mots d'amour | *Ente mutthe* → mon trésor · *Enikku ninne ishtamaanu* → Je t'aime · *Miss cheyyunnu* → Tu me manques |
| 6 | Survie au Kerala | *Ethra?* → Combien ? · *Venda* → Je n'en veux pas · *Shari* → D'accord · *Evide?* → Où ? |

Later units: numbers, days/time, emotions, directions, simple sentence building (Malayalam is **Subject-Object-Verb**: *Njaan chaaya kudikkunnu* = "Je thé bois").

**Grammar is taught as patterns, never as rules tables** — e.g. "add *-o?* to make a question": *Vannu* (came) → *Vanno?* (did you come?).

---

## 3. Lesson & exercise types

Each lesson = 5–8 minutes, ~10 exercises, mix of:

1. **Discover card** — Manglish + French + 🔊 audio + French-ear pronunciation hint
2. **Listen & choose** — hear audio, pick the French meaning
3. **Choose the Manglish** — see French, pick the right Manglish
4. **Match pairs** — tap matching Manglish ↔ French tiles
5. **Build the sentence** — arrange word tiles (teaches SOV order)
6. **Type it** — type Manglish, forgiving match (accepts *ende/ente*, missing double letters)
7. **Say it** (v2) — record herself, play back next to your recording

**Spaced repetition** (simple Leitner boxes): words she misses come back sooner; known words fade out. A daily "Révision" session pulls due words.

---

## 4. Gamification — yes, and it fits well

Recommended (motivating without stress for a beginner):

| Feature | How it works |
|---|---|
| **XP + levels** | XP per lesson; levels named after Kerala places: Kochi → Alleppey → Munnar → Varkala → Kozhikode |
| **Streak 🔥** | Daily streak, with 1 free "streak freeze" per week (no guilt spirals) |
| **Badges** | "Première chaaya", "Approuvée par Amma", "100 mots", "7 jours de suite" |
| **Kerala map** | Progress shown as a journey across a map of Kerala |
| **Boss lessons** | End of unit challenge, e.g. "Dîner chez Amma" — a mini dialogue scenario |
| **Hearts?** | **Skip.** Losing lives frustrates beginners. Use "try again" instead |
| **💌 Real-life rewards (the personal twist)** | You set rewards she unlocks: "Level 3 → you cook her a Kerala dinner", "30-day streak → date night". Hidden until unlocked |
| **Message from you** | Finishing a unit unlocks a short voice/video note from you in Malayalam (+ translation) |

---

## 5. Tech plan

| Choice | Pick | Why |
|---|---|---|
| App type | **PWA** (web app installable on phone) | One codebase, no app store, works on her iPhone/Android |
| Framework | React + Vite + TypeScript, Tailwind | Fast to build, easy to host |
| Content | JSON files (`units/*.json`) | You edit words without touching code |
| Progress | localStorage / IndexedDB on her phone | No backend, no login needed for MVP |
| Audio | Your recordings as `.mp3` in `/audio`; TTS fallback | Authentic voice |
| Hosting | **Cloudflare Pages** (free) | Static site, unlimited bandwidth (good for audio files), HTTPS for PWA install, deploy via `wrangler pages deploy dist` or GitHub auto-deploy |
| v3 sync | Supabase (free tier) | Only if you want couple features (see her progress, send phrases) |

**Content data shape (per word):**
```json
{ "id": "u1-namaskaaram", "manglish": "Namaskaaram", "fr": "Bonjour",
  "hint_fr": "na-mas-kaa-ram (le 'r' roulé léger)", "ml": "നമസ്കാരം",
  "audio": "audio/u1/namaskaaram.mp3", "accept": ["namaskaram", "namaskaaram"] }
```

---

## 6. Roadmap

| Phase | Scope | Effort |
|---|---|---|
| **MVP (v1)** | Units 1–3, exercise types 1–6, XP, streak, Kerala-map progress, French UI, TTS audio | 2–3 weekends |
| **v2** | Units 4–6, your recorded audio, badges, boss lessons, real-life rewards, spaced repetition review | +2 weekends |
| **v3 – couple mode** | You see her progress, send a "phrase of the day", she replies with voice; "Say it" exercise | +2–3 weekends |

---

## 7. Risks & how to handle them

1. **Content is the real work, not code.** 150 phrases × (Manglish + French + hint + audio). → Write content in a spreadsheet first, 20 phrases a sitting; app reads it.
2. **Inconsistent Manglish confuses her.** → Lock the spelling scheme (section 1) before writing content.
3. **French translations sounding off.** → Have her correct the French — it doubles as a fun shared activity.
4. **She drops off after a week.** → Short lessons, streak freeze, real-life rewards, your voice notes. Keep it *hers*, not homework.
5. **Malayalam TTS quality is meh.** → Prioritise recording your voice for the top 100 phrases.

---

## 8. Next steps

1. Confirm: PWA (web) vs native app — **recommend PWA**.
2. Fill the content sheet for Units 1–3 (~60 phrases).
3. Build MVP: scaffold → lesson engine → exercises → gamification → deploy.
4. Give her the link, watch her use it once, adjust.
