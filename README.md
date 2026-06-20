# Hotdogify 🌭

Is it a hotdog, or not a hotdog? Upload a photo and a vision model gives you a
verdict, confidence, and a guess at what the image actually shows.

- **Landing demo** (`/`) — drop in an image and classify it instantly.
- **Dashboard** (`/dashboard`) — issue API keys and review your recent activity.
- **Classify API** (`POST /api/v1/classify`) — authenticate with `Authorization: Bearer <key>` and send an image.
- **Admin** (`/admin`) — service-wide metrics: volume, verdict split, traffic source, and reported wrong answers.

Built with Next.js (App Router), Supabase (Postgres + auth), and fal.ai → OpenRouter for the model (choose [fal.ai](http://fal.ai) because I had extra credits left :) ).

The classifier runs on **Google Gemini 2.5 Flash**. It's a fast, cheap vision model, and more than good enough for a binary hotdog / not-hotdog call. A heavier model would add cost and latency for no real accuracy gain on a task this simple.

## Limitations

There's no sign-up or password flow. Visitors get an **anonymous Supabase session** automatically. This keeps the demo frictionless and the codebase small, auth is deliberately left out for simplicity. For the same reason, `/admin` is **not access-controlled**; treat it as a demo dashboard, not a  
secured surface.

There's no way to report a wrong answer through the API.