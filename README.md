# Panoramic Dream Weaver

Panoramic Dream Weaver is a segment-based 360 scene prompt builder for AI image and video workflows. It helps you break a panoramic world into structured zones and slices, generate detailed prompts for each segment, and combine them into a coherent master prompt for immersive panoramic generation.

## What It Does

- Create and manage panoramic scenes with metadata like location, era, weather, season, and style.
- Split a 360 scene into zones and directional slices.
- Write segment-level content descriptions and notes.
- Generate per-segment prompts with Groq.
- Merge those prompts into a single master panoramic prompt.
- Upload and preview equirectangular panoramic reference images in an interactive 360 viewer.
- Store projects, auth, and assets through Supabase.

## Feature Overview

- Authentication with Supabase
- Scene list and editor flows
- Segment-based prompt authoring
- Master prompt synthesis
- Panoramic image upload
- Interactive 360 viewer built with Three.js
- TanStack Router + TanStack Query app structure

## Stack

- React 19
- TanStack Start / Router / Query
- Vite
- Supabase
- Groq SDK
- Three.js
- Tailwind CSS

## Project Structure

```text
src/
  components/         UI, viewer, editor panels
  hooks/              Auth and app hooks
  integrations/       Supabase clients and types
  lib/                API helpers, constants, prompt generation
  routes/             App routes
supabase/
  migrations/         Database and storage changes
```

## Environment Variables

Create a local `.env` file from `.env.example`.

Required values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_GROQ_API_KEY`

Example:

```bash
cp .env.example .env
```

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Supabase

This repo includes Supabase migrations under `supabase/migrations/`.

Before running the app, make sure your Supabase project is configured and the required tables, auth policies, and storage setup are applied.

## Notes

- The app expects a valid Groq API key locally for prompt generation.
- Secrets are intentionally not committed.
- The current UI is functional and fast to iterate on, but still prototype-heavy.

## Suggested GitHub Description

`Segment-based 360 panoramic scene prompt builder for AI image and video generation with Supabase auth and immersive preview.`
