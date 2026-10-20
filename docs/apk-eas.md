# Host the API, then build an APK

The phone must talk to a **public HTTPS API**. The APK bakes that URL in at build time. No GitHub required. Expo Go is not this path.

Production is **Fly.io** (one `shared-cpu-1x` / 512MB Machine in `ams`, scale-to-zero) plus **Neon Postgres**. Gemini and Apify stay on their free tiers. Do not add Fly Postgres, a volume, or a dedicated IPv4.

## 1. Host the API

Install [flyctl](https://fly.io/docs/flyctl/install/), then from the Savorly root (where `Dockerfile` and `fly.toml` live):

```bash
fly auth login
fly launch --no-deploy --copy-config --name savorly-api --region ams --yes
```

Refuse extra Machines and any “Add Postgres?” prompt. `fly.toml` already sets port 4000, `auto_stop_machines = "stop"`, and `min_machines_running = 0`. There is no HTTP health check on purpose: proxy checks can keep the Machine awake.

Copy the live secrets from the previous host. Use the Neon **pooled** URL (`sslmode=require`). Keep the same `JWT_SECRET` or existing sessions log out. Never commit these:

```bash
fly secrets set \
  DATABASE_URL="postgres://…@….neon.tech/neondb?sslmode=require" \
  JWT_SECRET="…" \
  ADMIN_PASSWORD="…" \
  GEMINI_API_KEY="…" \
  APIFY_TOKEN="…" \
  USDA_FDC_API_KEY="…" \
  FATSECRET_CLIENT_ID="…" \
  FATSECRET_CLIENT_SECRET="…" \
  USE_MOCK_IMPORTS="false" \
  PORT="4000"
```

Do not attach Google Cloud billing to the Gemini project, and do not turn on Apify auto-refill. Free-tier quota failures should stop the feature, not bill you.

```bash
fly deploy
fly scale count 1
fly machines list
curl https://savorly-api.fly.dev/health
```

`fly machines list` must show **one** Machine. `/health` returns `{"ok":true}`. The first request after idle takes a few seconds (VM boot, migrate, Neon wake). A second request is immediate.

Login: **admin** and the `ADMIN_PASSWORD` secret.

Keep `GEMINI_API_KEY`, `APIFY_TOKEN`, `DATABASE_URL`, and `JWT_SECRET` on Fly. Never put them in the APK.

## 2. Point the APK at that URL

`apps/mobile/eas.json` preview profile sets `EXPO_PUBLIC_API_URL` to `https://savorly-api.fly.dev` (no trailing slash). An already-installed APK keeps the URL it was built with until you install a new preview build.

## 3. Build the APK

Needs a free [Expo](https://expo.dev) account. From `apps/mobile`:

```bash
npx eas-cli login
npx eas-cli build -p android --profile preview
```

When the build finishes, download the APK and install it. Allow installs from the browser if Android asks.

## 4. Open the app

Sign in with **admin** and the API `ADMIN_PASSWORD`. Log a diary item before suspending the old host. Live Instagram and YouTube imports need `APIFY_TOKEN` and `GEMINI_API_KEY` on the API; YouTube uses `APIFY_YOUTUBE_ACTOR` (default `autofacts/youtube-subtitle-transcript-scraper`). Pasting a food label uses Gemini only.
