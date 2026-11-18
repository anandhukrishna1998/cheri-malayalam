# Mon Cours (Julie) — Design Document

## 1. Intent & Context
This feature is designed for Julie (the user's girlfriend), who is learning Malayalam with a professor and has detailed chronological course notes (from October 1 to November 13, 2026). She needs:
1. A dedicated **"Mon cours"** space in the app to consult her professor's course notes, vocabulary, conjugations, and grammar rules (like *Und vs Aanu*).
2. A **playful interactive learning mode ("type Duolingo / Drop")** that generates sentence translation quizzes in both directions (French ➔ Manglish, e.g. *"Est-ce que tu as dormi ?"* ➔ *"Ni urangiyo ?"*, and Manglish ➔ French, e.g. *"Aval ivide urangiyo ?"* ➔ *"Est-ce qu'elle a dormi ici ?"*) and vocabulary drills (*Vérité : sathyam*, *kallam : Mensonge*).
3. The ability to **introduce future words and phrases** she learns in upcoming classes directly into the system, persisting them locally and adding them automatically to her quiz pool, course notes, and translation search.
4. Seamless integration with audio playback and offline search.

## 2. Approaches Considered & Trade-offs
- **Approach A (Dedicated "Mon cours" tab — SELECTED):**
  Add a dedicated tab in the navigation bar. Provides a first-class home for her notes, custom entries, and targeted practice. Very clear separation of her personal course from the standard path.
- **Approach B (Embedded in Apprendre & Entraînement):**
  Add a banner at the top of "Apprendre" and a card in "Entraînement". Kept 5 tabs, but fragmented her notes from her practice.
- **Approach C (Replace Dialogues):**
  Replaced the Dialogues tab to stay at 5 tabs. Removed quick access to dialogues.

Approach A was selected by the user.

## 3. Data & Content Structure
### Preloaded Course Notes (`src/content/course.json`)
Structured into course sessions and reference sheets:
- `vocab_famille`: Family vocabulary (Achan, Amma, Chettan, Chechi, Aniyan, Aniyathi, etc.)
- `c_2026_10_01`: Pronouns, greetings, question words, essential phrases (Sugamano, Manasilayo, Ente peeru Julie, etc.)
- `c_2026_10_08`: Core verbs, personal pronouns, tense endings (-unnu, -um)
- `c_2026_10_22`: Verb questions in `-o` (kazhicho, urangiyo, nadanno), daily words (sathyam, kallam, kollam, sherikkum), question words, daily phrases, numbers 1–10
- `c_2026_10_29`: Body parts (kannu, mooku, etc.), pain expressions (vedana, thala vedanikunnu), `untakuka/undu`, numbers 11–20
- `c_2026_11_05`: Demonstratives, vocatives Da/Di, tenses table for *uranguka* and *nadakkuka*, example sentences by tense, conversation questions (Ni urangiyo?, Aval ivide urangiyo?, etc.)
- `c_2026_11_12`: Time words (innu, nale, innale, ippo, rawile, rathri, etc.), calendar terms, numbers 21–30
- `c_2026_11_13`: Comprehensive 14-verb table (Infinitive, Present, Past, Future, Question `-o`, Imperative), `-o` question rule, and the comprehensive **UND vs AANU** master lesson (existence/possession vs identification/description with direct contrast examples)

### User-added Custom Course Items
Saved in `Progress` in `src/lib/store.ts`:
```ts
customCourseItems: { id: string; manglish: string; fr: string; ml?: string; date?: string; note?: string }[]
```
- Fully included in JSON backup/restore (`exportProgress` / `importProgress`).
- Injected into course search, offline translator, and interactive practice pool.

## 4. Interactive "Mon cours" Practice Experience (Duolingo / Drop style)
An interactive training engine specific to Julie's course items:
1. **Sentence Translation FR ➔ Manglish:** Given *"Est-ce que tu as dormi ?"*, prompt user to translate to *"Ni urangiyo ?"* (either by assembling scrambled word tiles, multiple-choice selection, or typing).
2. **Sentence Translation Manglish ➔ FR:** Given *"Aval ivide urangiyo ?"*, prompt user to translate to *"Est-ce qu'elle a dormi ici ?"*.
3. **Word & Vocab Matching:** Fast pairs or cards (e.g. *sathyam* ↔ *vérité*, *kallam* ↔ *mensonge*).
4. **Tile Builder:** Scrambled word chips to tap in order, matching Duolingo style.
5. **Instant Audio Playback:** Listen to the phrase spoken in Malayalam.

## 5. UI Layout
- **Tab Bar:** Add `['cours', '📝', 'Mon cours']`. Responsive CSS adjustment so 6 tabs fit cleanly on mobile screens (`padding`, font-size `10px`, icon size `20px`).
- **Mon Cours Screen (`Course.tsx`):**
  - **Hero Header:** Summary ("Les notes de Julie avec son professeur"), current item count, quick buttons:
    - `▶ S'entraîner sur mon cours` (launches interactive game session)
    - `+ Ajouter un mot / une phrase` (opens simple input modal)
  - **Category / Date Filter Chips:** `Tous`, `Par date`, `Verbes & -o`, `Und vs Aanu`, `Famille & Corps`, `Nombres 1-30`, `Mes ajouts`.
  - **Search Bar:** Real-time search in Julie's course notes.
  - **Card / Sheet Layout:** Expandable / readable cards with French, Manglish, Malayalam, hints, and speaker buttons.
  - **Grammar Guide Panels:** Visual callouts for the *Und vs Aanu* rule and `-o` question rule.
