# Stock Market Dashboard

A React dashboard and FastAPI backend for stock quotes, charts, fundamentals, news, and user profiles. Finnhub provides market data; Supabase provides authentication and PostgreSQL-backed profile/watchlist storage.

## Backend

```sh
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in your own Supabase, Finnhub and JWT settings.
uvicorn main:app --reload
```

Use a dedicated Supabase project. Review `backend/supabase_setup.sql` before running it in the Supabase SQL editor. `supabase_setup_v2.sql` is an additional recovered schema variant, not an automatic follow-up migration. `backfill_profiles.sql` copies existing auth-user metadata into missing profiles; it contains no exported user records. Configure server-side Supabase permissions for the existing backend; never place privileged keys in frontend variables.

## Frontend

In another terminal:

```sh
cd frontend
npm ci
cp .env.example .env
npm run dev
```

Open http://localhost:5173. `VITE_API_URL` defaults to http://localhost:8000 for authentication; some existing market-data components use a fixed localhost API address. Run both services locally for the recovered configuration.

## Verification and limits

The frontend production build passed using the existing installed dependencies and Vite's runner config loader. It reports a bundle over 500 kB. Python files parse successfully. Existing lint checks report six errors and two warnings around effect state updates, unused variables and Fast Refresh; these are recorded rather than hidden. Supabase/Finnhub credentials were not used, and signup, profile changes and market-data endpoints were not exercised against live services.

This is a development project, not a deployed trading service. The original shared Supabase client/auth flow needs a separate multi-user review before deployment. Existing application logic is retained. Environment files, installed dependencies and generated builds are excluded; example settings and package lockfile are included. See backend/SETUP.md for a short setup reference.
