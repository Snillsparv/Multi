# Multiplikation

Adaptiv webbsida för att öva multiplikationstabellen 1–10. Två lägen
(barn / vuxen) och spaced repetition baserad på Leitner-systemet.

Specen som driver implementationen finns i [`multiplikation-spec.md`](./multiplikation-spec.md).

## Tech stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** + shadcn-stil komponenter
- **Supabase** — Auth (magic link) + Postgres + Row Level Security
- **Zustand** för session-state
- **Lucide-react** för ikoner

## Komma igång lokalt

```bash
npm install
cp .env.example .env.local   # fyll i värdena från Supabase
npm run dev
```

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Supabase-setup

1. Skapa ett projekt på [supabase.com](https://supabase.com).
2. Kör SQL-migrationen i `supabase/migrations/0001_init.sql`
   via **SQL Editor** i dashboarden.
   Den skapar tabeller, RLS-policies, och en trigger som auto-skapar profil +
   100 `fact_mastery`-rader för varje ny användare.
3. Under **Authentication → URL Configuration**:
   - Site URL: din publika URL (lokalt: `http://localhost:3000`)
   - Redirect URLs: lägg till samma URL + `/auth/callback`

## Filstruktur

```
app/
  (auth)/login/        magic link login
  (app)/
    layout.tsx          auth guard + global header
    dashboard/          välkomst, streak, heatmap, snabbstart
    practice/           övning + diagnostiskt test
    onboarding/         namn + läge + diagnostiskt test
    settings/           profil, läge, logga ut
  auth/callback/        OAuth/magic-link callback
  auth/signout/         POST → clear session
  api/session/          POST attempt, PATCH avsluta + uppdatera streak
components/
  Heatmap.tsx           10×10 mästerskap-grid
  PracticeQuestion.tsx  fråga + numpad + feedback
  Numpad.tsx
  ui/                   knapp, kort, input, label
lib/
  supabase/             client + server + middleware
  leitner.ts            algoritmen (box, due, queue)
  strategies.ts         minnesregler för svåra fakta
  utils.ts              cn()
stores/
  sessionStore.ts       Zustand
supabase/migrations/    SQL för Supabase
middleware.ts           refreshar session, skyddar privata rutter
```

## Adaptiv algoritm

Varje av 100 multiplikationsfakta lever i en av 5 Leitner-lådor.

| Box | Intervall till nästa visning |
|-----|------------------------------|
| 1   | omedelbart (samma session)   |
| 2   | 1 dag                        |
| 3   | 3 dagar                      |
| 4   | 7 dagar                      |
| 5   | 21 dagar                     |

- **Rätt + snabbt** (< 3 sek) → `box = min(box + 1, 5)`
- **Rätt + långsamt** → samma låda, +1 dag
- **Fel** → `box = 1`, dyker upp igen i samma session

Frågeurval per session: alla förfallna sorterade efter låda + due-tid, fyllda
till 20 från lägsta lådorna; aldrig samma faktum två gånger i rad.

## Deploy via Railway

Se ”Deploy via Railway + GitHub” i specen. Kort:

1. Push till GitHub.
2. Skapa nytt projekt på Railway → Deploy from GitHub repo.
3. Lägg till de tre env vars under **Variables**.
4. Generera publik domän under **Settings → Networking**.
5. Lägg in domänen i Supabase **Authentication → URL Configuration**
   som Site URL och redirect (`/auth/callback`).
