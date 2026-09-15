# Host the API, then build an APK

The phone must talk to a **public HTTPS API**. The APK bakes that URL in at build time. No GitHub required. Expo Go is not this path.

## 1. Host the API

On a VPS (or any Docker host) in the Savorly folder:

```bash
cp .env.production.example .env.production
```

Put a real `POSTGRES_PASSWORD` and `JWT_SECRET` in `.env.production`. Then:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Put HTTPS in front of port 4000 (Caddy, nginx, or the host’s reverse proxy). Confirm:

```bash
curl https://YOUR-API-HOST/health
```

should return `{"ok":true}`.

Login: **admin** / **admin**.

Keep `GEMINI_API_KEY`, `APIFY_TOKEN`, `DATABASE_URL`, and `JWT_SECRET` on the server. Never put them in the APK.

## 2. Point the APK at that URL

In `apps/mobile/eas.json`, set `EXPO_PUBLIC_API_URL` to that HTTPS origin (no trailing slash), for example `https://savorly.example.com`.

## 3. Build the APK

Needs a free [Expo](https://expo.dev) account. From `apps/mobile`:

```bash
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build -p android --profile preview
```

EAS uploads the project (still no GitHub). When the build finishes, download the APK and install it. Allow installs from the browser if Android asks.

## 4. Open the app

Sign in with **admin** / **admin**. Imports work against the hosted API. With `USE_MOCK_IMPORTS=true` on the server, imports return fixtures until Gemini/Apify keys are set.
