Logistics App

A React Native (Expo) delivery app with two roles: **Users** place orders and **Drivers** find and accept pending orders. Includes maps (TomTom), auth (Supabase), and real-time-style flows.

## Prerequisites

- **Node.js** 18+ and npm
- **Expo Go** on your phone (for quick testing), or Android Studio / Xcode for emulators
- **Supabase** account
- **TomTom** API key (for maps and geocoding)

## 1. Clone and install

```bash
cd logistics-project
npm install
```

## 2. Environment variables

Create a `.env` file in the project root with:

```env
# Supabase (required for auth and database)
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# TomTom (required for maps, search, routing)
TOMTOM_API_KEY=your_tomtom_key_here
```

- **Supabase:** In the [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Settings** → **API**: copy **Project URL** and **anon public** key.
- **TomTom:** Get an API key from [TomTom Developer Portal](https://developer.tomtom.com/).

Optional (for server-side or migrations):

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Do not commit `.env` or put real keys in the repo.

## 3. Supabase setup

The app expects these in your Supabase project:

### Tables

- **`PROFILE`** — `ID` (uuid, FK to `auth.users`), `EMAIL`, `ROLE` ('USER' | 'DRIVER'), `FULL_NAME`, `PHONE_NUMBER`
- **`PACKAGES`** — Orders: `SENDER_ID`, `DRIVER_ID`, `PICKUP_ADDRESS`, `PICKUP_LAT`, `PICKUP_LNG`, `RECIPIENT_ADDRESS`, `DROPOFF_LAT`, `DROPOFF_LNG`, `RECIPIENT_NAME`, `ORDER_CONTACT`, `VEHICLE_TYPE`, `PAYMENT_METHOD`, `ITEM_TYPES`, `NOTES`, `STATUS`, `PRICE`, `CREATED_AT`, etc.
- **`VEHICLE`** — Driver vehicles: `ID`, `DRIVER_ID`, `PLATE`, `MODEL`, `TYPE`

### Auth trigger

Create a trigger so new sign-ups get a `PROFILE` row:

```sql
-- Run in Supabase SQL Editor
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public."PROFILE" ("ID","ROLE","FULL_NAME","PHONE_NUMBER","EMAIL")
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'USER'),
    coalesce(new.raw_user_meta_data->>'name', 'No Name'),
    coalesce(new.raw_user_meta_data->>'phone_number', 'No Phone'),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### RPCs used by the app

The app calls these Supabase RPCs (so they work without relying on the JWT in Expo Go):

- **`insert_package`** — Place order (computes delivery price, inserts into `PACKAGES`)
- **`get_pending_orders(p_driver_id)`** — List pending orders for drivers (Find Orders map)
- **`get_my_orders(p_user_id, p_is_driver)`** — List orders for the Orders tab (user or driver)
- **`get_delivery_quote(...)`** — Estimated delivery price before placing order
- **`get_vehicle(p_driver_id)`** / **`upsert_vehicle(...)`** — Driver vehicle info

If you are building the DB from scratch, you’ll need to add these functions and grant `EXECUTE` to `anon` and `authenticated` as needed. Row-Level Security (RLS) is enabled on the tables; the RPCs use `SECURITY DEFINER` where required.

## 4. Run the app

Start the dev server:

```bash
npm start
```

Then:

- Press **`a`** for Android or **`i`** for iOS simulator, or
- Scan the QR code with **Expo Go** on your device (same Wi‑Fi as the machine running `npm start`).

To use Expo Go on a phone when not on the same network:

```bash
npx expo start --tunnel
```

Then scan the QR code with Expo Go.

### Scripts

| Command            | Description                    |
|--------------------|--------------------------------|
| `npm start`        | Start Expo dev server          |
| `npm run android`  | Start and open Android         |
| `npm run ios`      | Start and open iOS             |
| `npm run web`      | Run in the browser             |
| `npm run lint`     | Run ESLint                     |

## 5. App flow

- **Users:** Register/Login → Home → **Add** order (pickup, dropoff, vehicle, details) → see estimated price → place order → **Orders** tab (cards + route thumbnails, tap for details).
- **Drivers:** Register/Login as Driver → **Find Orders** (map with pending pickups, radius filter) → accept order → **Orders** → Mark as Delivered when at dropoff.
- **Profile:** View role (User/Driver), edit vehicle (drivers only), sign out.

## 6. Tech stack

- **Expo** (SDK 54) + **React Native** + **expo-router** (file-based routing)
- **Supabase** — Auth (email/password), Postgres, RLS, RPCs
- **TomTom** — Maps, geocoding, routing
- **expo-secure-store** — Session persistence (Expo Go–friendly)
- **expo-location** — GPS for driver and maps

## 7. Troubleshooting

- **“Missing Supabase env”** — Ensure `.env` has `SUPABASE_URL` and `SUPABASE_ANON_KEY` and that `app.config.js` passes them in `extra`. Restart the dev server after changing `.env`.
- **Orders or Find Orders empty** — The app uses RPCs (`get_my_orders`, `get_pending_orders`) so they work without the JWT. If you still see no data, confirm the RPCs exist and the DB has the expected tables and data.
- **Expo Go “failed to download remote update”** — In `app.config.js`, `updates.enabled` is set to `false` so the app loads from the dev server. Using `npx expo start --tunnel` often helps when not on the same network.
- **Maps blank or no tiles** — Check `TOMTOM_API_KEY` in `.env` and that the key has Map and Search (and Routing if used) enabled in the TomTom developer portal.

