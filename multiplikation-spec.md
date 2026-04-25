# Multiplikationstabell-app — Kickoff-spec

En adaptiv webbsida för att öva multiplikationstabellen 1–10, med två lägen (barn/vuxen) och vetenskapligt grundad spaced repetition.

## Tech stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** — Auth + Postgres + Row Level Security
- **Zustand** för session-state (lättviktigt)
- **Railway** för deploy (via GitHub auto-deploy)
- **Lucide-react** för ikoner

## Datamodell (Supabase)

```sql
-- Användarprofil (länkad till auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  mode text check (mode in ('kid', 'adult')) default 'kid',
  onboarded boolean default false,
  created_at timestamptz default now()
);

-- Mästerskapsstatus per faktum (en rad per a×b-kombo per användare)
-- 100 rader per användare för tabellerna 1–10
create table fact_mastery (
  user_id uuid references profiles(id) on delete cascade,
  a smallint not null,           -- 1–10
  b smallint not null,           -- 1–10
  box smallint default 1,        -- Leitner-låda 1–5
  correct_count int default 0,
  wrong_count int default 0,
  avg_response_ms int,
  last_seen_at timestamptz,
  next_due_at timestamptz default now(),
  primary key (user_id, a, b)
);

-- En övningssession
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  mode text check (mode in ('diagnostic', 'practice', 'flow')),
  started_at timestamptz default now(),
  ended_at timestamptz,
  total_questions int default 0,
  correct_count int default 0
);

-- Enskilda svar (för analys + adaptiv algoritm)
create table attempts (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  a smallint not null,
  b smallint not null,
  given_answer int,
  correct boolean not null,
  response_ms int not null,
  answered_at timestamptz default now()
);

-- Streaks
create table streaks (
  user_id uuid primary key references profiles(id) on delete cascade,
  current_streak int default 0,
  longest_streak int default 0,
  last_practice_date date
);
```

**RLS-policies:** Alla tabeller — användare kan bara läsa/skriva sina egna rader (`auth.uid() = user_id`).

## Adaptiv algoritm — Leitner-system

Varje faktum lever i en av 5 lådor. Lägre låda = visas oftare.

**Vid rätt svar:**
- Rätt + snabbt (< 3 sek) → `box = min(box + 1, 5)`, `next_due_at += interval[box]`
- Rätt + långsamt → samma låda, `next_due_at += 1 dag`

**Vid fel svar:**
- `box = 1`, `next_due_at = now()` (kommer tillbaka direkt i samma session)
- Visa rätt svar + ev. minnesstrategi

**Intervall per låda:**
```
box 1: omedelbart (samma session)
box 2: 1 dag
box 3: 3 dagar
box 4: 7 dagar
box 5: 21 dagar
```

**Frågeurval (per session):**
1. Hämta alla fakta där `next_due_at <= now()` — sortera på `box` (lägst först), sen `next_due_at` (äldst först)
2. Om färre än 20 förfallna → fyll på med slumpmässiga från användarens lägsta lådor
3. Aldrig samma faktum två gånger i rad

## MVP — Vad som ska byggas i fas 1

### 1. Auth & onboarding
- Supabase magic link login
- Vid första inloggning: välj namn + läge (barn/vuxen)
- Diagnostiskt test: 30 blandade frågor — populerar `fact_mastery` med startvärden

### 2. Dashboard
- Välkomsthälsning + dagens streak
- **Heatmap 10×10**: varje cell färgad efter `box` (röd→grön gradient)
- Knapp: "Starta övning" (5 min / 20 frågor)
- Knapp: "Fokusera tabell" (välj 1–10)

### 3. Övningsläge
- En fråga i taget, stort talangrytt
- Numpad på mobil, tangentbord på desktop
- Direkt feedback: ✅ (grön flash) eller ❌ (röd flash + visa rätt svar)
- Vid fel: liten textruta med strategi om vi har en ("9× = sänk första, höj andra till 9")
- Progressbar längst upp
- Resultatskärm: antal rätt, snitt-tid, vilka fakta som flyttades upp/ner

### 4. Inställningar
- Toggle: barn-läge / vuxen-läge
  - Barn: större typsnitt, färger, tummen-upp-animationer
  - Vuxen: minimalistisk, kompakt, visar response-tid
- Logga ut

## Fas 2 (efter MVP)

- **Flow-läge**: 60 sekunder, så många rätt som möjligt
- **Strategi-bibliotek**: minnesregler för de svåra (6×7, 7×8, 8×9)
- **Föräldra-/lärarvy**: se ett barns framsteg, identifiera svaga fakta
- **Belöningssystem**: bälten per tabell (vit → svart) baserat på box-genomsnitt

## Designprinciper

- **Mobile-first** — barn använder telefoner/surfplattor
- **Stora träffytor** — minst 44×44 px för knappar
- **Snabb laddning** — ingen frustration mellan frågor
- **Inga distraktioner under övning** — minimera UI när en fråga visas
- **Feedback inom 100 ms** — känns omedelbart

## Kom igång

```bash
npx create-next-app@latest multiplikation --typescript --tailwind --app
cd multiplikation
npm install @supabase/supabase-js @supabase/ssr zustand lucide-react
npx shadcn@latest init
```

Sätt upp Supabase-projekt, kör SQL ovan, lägg till `.env.local` med:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Filstruktur (förslag)

```
app/
  (auth)/login/page.tsx
  (app)/
    dashboard/page.tsx
    practice/page.tsx
    settings/page.tsx
    layout.tsx          # auth guard
  api/
    session/route.ts    # spara attempts, uppdatera mastery
components/
  Heatmap.tsx
  PracticeQuestion.tsx
  Numpad.tsx
  ui/                   # shadcn-komponenter
lib/
  supabase/client.ts
  supabase/server.ts
  leitner.ts            # algoritm-logik
  strategies.ts         # minnesregler för svåra fakta
stores/
  sessionStore.ts       # Zustand
```

## Deploy via Railway + GitHub

### 1. Förberedelse i repo
- Skapa GitHub-repo, pusha första commit
- Lägg `.env.local` i `.gitignore` (default i Next.js — dubbelkolla)
- Lägg till `.env.example` med tomma värden så det syns vilka env vars som krävs:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  ```

### 2. Railway-setup
1. Skapa nytt projekt på railway.app → "Deploy from GitHub repo"
2. Välj reposet — Railway detekterar Next.js automatiskt
3. Under **Variables**: lägg till de tre env vars ovan med riktiga värden
4. Under **Settings → Networking**: generera en publik domän (t.ex. `multiplikation.up.railway.app`)
5. Lägg till en custom domain senare om du vill (t.ex. `tabell.jonasvonessen.se`)

### 3. Supabase-konfiguration
- I Supabase Dashboard → **Authentication → URL Configuration**:
  - Site URL: `https://multiplikation.up.railway.app` (eller din custom domain)
  - Redirect URLs: lägg till samma URL + `/auth/callback`
- Detta är viktigt — annars funkar inte magic link-mejlen i produktion

### 4. Auto-deploy
- Default: push till `main` → auto-deploy
- Rekommendation: jobba i feature-branches, merga till `main` när det är testat lokalt
- Railway visar build-loggar i realtid om något krånglar

### 5. Kostnad
- Railway: $5/mån "Hobby"-plan räcker länge för en sån här app
- Supabase: free tier (500 MB DB, 50k auth-användare) räcker mer än väl till start
