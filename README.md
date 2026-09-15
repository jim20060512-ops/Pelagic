# Pelagic

React + Vite prototype for a photo-led dive log.

## Run locally

```powershell
npm install
npm run dev
```

`localhost` only works on the computer running the development server. It is not a shareable website address.

## Share with friends

Deploy the project to a hosting provider such as Netlify or Vercel:

1. Put this project in a GitHub repository.
2. In Netlify or Vercel, import that repository.
3. Set the build command to `npm run build` and the publish directory to `dist`.
4. The provider gives you a public HTTPS address that can be shared.

Deployment makes the website reachable, but it does not yet make users' logs shared or persistent. The current prototype stores a chosen image and record only in the open browser session. A production release needs authentication, a database, image storage, and a real species-identification provider.

## Enable cloud accounts and dive logs

The project now includes a Supabase client, a `dive_logs` table migration, row-level security policies, and a `dive-photos` storage bucket policy.

1. Create a Supabase project and copy `.env.example` to `.env`.
2. Fill in the project URL and **publishable** key. Never put a `service_role` key in a Vite environment file.
3. Run [`supabase/migrations/20260916_initial_schema.sql`](supabase/migrations/20260916_initial_schema.sql) in the Supabase SQL editor.
4. Enable the desired sign-in provider in Supabase Auth, then connect the app's sign-in UI to `src/lib/supabase.js`.

The browser client uses the Supabase publishable key; the database and storage policies restrict each authenticated user to their own records.

## Map data

The global map uses OpenStreetMap tiles and requests public `scuba_diving` / `diving` points from the Overpass API after the user zooms into a region. When recording a dive, the user clicks the map to store the exact latitude and longitude; the saved record appears as a personal marker on the map for that browser session. Coverage depends on community-maintained OpenStreetMap data; it is not a claimed complete commercial dive-site database.
