# Architecture

Savorly is a small monorepo: Expo app, Hono API, shared DTOs.

## Import pipeline

The mobile app sends a provider-neutral `RecipeImportRequest`. Adapters live only on the API:

- `InstagramRecipeImporter` — Apify caption + transcript
- `WebsiteRecipeImporter` — SSRF-safe fetch, JSON-LD Recipe first, readable extract otherwise
- `TextRecipeImporter` — pasted text

All three become `ImportedRecipeSource`, then Gemini (or the mock normalizer) returns `GeneratedRecipe`. The app never sees Apify, Cheerio, or Gemini payloads.

## Persistence

Postgres is the source of truth. `expo-sqlite` is a write-through cache for offline list/search. Saves go to the API first. Indexes cover title, category, tags, ingredient names, source name, and author. No full-text engine in MVP.

## Media

Do not persist social or webpage media. Saved recipes always render the bundled `FoodCategory` image.

## Identity

Email/password JWT. Register and login live in the Expo app. The API issues a 30-day HS256 token (`JWT_SECRET`). Recipe routes require `Authorization: Bearer`. Tokens are stored in SecureStore on native and `localStorage` on web. On first boot the API seeds `admin@savorly.local` with password `admin` if that row is missing; login also accepts the shorthand `admin`. Gemini and Apify keys stay on the API, not in the app.

## UI

Dark-first tokens in `apps/mobile/src/theme/tokens.ts`. Light mode is out of MVP.
