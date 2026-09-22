# Savorly

Personal recipe inbox. Import a public Instagram Reel, a recipe webpage, or pasted text. Review once. Save. Search later.

This repo is standalone. It is not part of KidsKonnect, Ovivio, or staff-planner.

```
savorly/
  apps/mobile     Expo / React Native
  apps/api        Hono + Postgres
  packages/shared DTOs only
  docs/           architecture + APK notes
```

## Run locally

1. Start Postgres (Docker Desktop must be running). Savorly uses **5433** so it does not collide with the KidsKonnect `postgres` container on 5432:

```bash
docker compose up -d
```

2. Copy environment files:

```bash
cp .env.example .env
cp .env.example apps/api/.env
```

3. Install and migrate:

```bash
npm install
npm run db:migrate
```

4. API:

```bash
npm run dev:api
```

`USE_MOCK_IMPORTS=true` (default in `.env.example`) returns fixture recipes so the app works without Gemini or Apify. Set it to `false` and add `GEMINI_API_KEY` / `APIFY_TOKEN` for live imports. Diary USDA search uses a local staple list unless `USDA_FDC_API_KEY` is set.

5. Mobile (from `apps/mobile`, or `npm run dev:mobile`):

```bash
npx expo start
```

Point `EXPO_PUBLIC_API_URL` at the API. Android emulator: `http://10.0.2.2:4000`. Physical device on the same Wi-Fi: your machine LAN IP.

To use it on the phone **without this laptop**, host the API and install an APK. See `docs/apk-eas.md`.

Sign in with **admin** and the `ADMIN_PASSWORD` from `apps/api/.env` (seeded/rotated on API start). You can still create another account. Imports and the recipe library require a signed-in session.

## What is stored

Recipe text, category, tags, and source attribution. No Instagram videos, no downloaded webpage images, no thumbnail blobs. Library cards use bundled category artwork.

## Tests

```bash
npm test
```
