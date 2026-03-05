-- ============================================================
-- LOGISTICS ADMIN PANEL — REQUIRED DATABASE MIGRATIONS
-- Run these in your Supabase SQL editor (in order).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. DRIVER APPROVAL
--    Adds IS_APPROVED to PROFILE so admins can approve/block drivers.
--    Default TRUE so existing accounts are unaffected.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "PROFILE"
  ADD COLUMN IF NOT EXISTS "IS_APPROVED" boolean NOT NULL DEFAULT true;

-- Optional: Set new DRIVER signups to pending approval (FALSE)
-- You would enforce this via your insert_package/handle_new_user trigger,
-- or let the admin manually toggle it in the panel.

-- ─────────────────────────────────────────────────────────────
-- 2. VEHICLE APPROVAL
--    Adds IS_APPROVED to VEHICLE so admins can approve each vehicle.
--    Default FALSE so new vehicles require approval.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "VEHICLE"
  ADD COLUMN IF NOT EXISTS "IS_APPROVED" boolean NOT NULL DEFAULT false;

-- Approve all existing vehicles so they aren't suddenly blocked
UPDATE "VEHICLE" SET "IS_APPROVED" = true WHERE "IS_APPROVED" = false;

-- ─────────────────────────────────────────────────────────────
-- 2b. VEHICLE PLATE OPTIONAL
--     Allow PLATE to be NULL so drivers can register without a plate.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "VEHICLE"
  ALTER COLUMN "PLATE" DROP NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 3. PRICING CONFIG TABLE
--    Stores configurable base fare + per-km rate per vehicle type.
--    The admin panel reads/writes this table.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PRICING_CONFIG" (
  "ID"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "VEHICLE_TYPE" text UNIQUE NOT NULL,
  "BASE_FARE"    numeric NOT NULL DEFAULT 40,
  "PER_KM_RATE"  numeric NOT NULL DEFAULT 10,
  "UPDATED_AT"   timestamptz DEFAULT now()
);

-- Seed with default rates for all vehicle types
INSERT INTO "PRICING_CONFIG" ("VEHICLE_TYPE", "BASE_FARE", "PER_KM_RATE") VALUES
  ('bike',        30,  8),
  ('motorcycle',  40,  10),
  ('car',         100, 15),
  ('mpv',         150, 20),
  ('van',         180, 22),
  ('l300',        200, 23),
  ('small truck', 200, 25),
  ('large truck', 300, 35),
  ('truck',       200, 25)   -- legacy fallback used in DB function
ON CONFLICT ("VEHICLE_TYPE") DO NOTHING;

-- Enable RLS
ALTER TABLE "PRICING_CONFIG" ENABLE ROW LEVEL SECURITY;

-- Allow admins (service role) full access — already bypassed by service key
-- Allow anon read for the mobile app to fetch prices
DROP POLICY IF EXISTS "pricing_config_read" ON "PRICING_CONFIG";
CREATE POLICY "pricing_config_read" ON "PRICING_CONFIG"
  FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────────
-- 4. UPDATE calculate_delivery_price TO USE PRICING_CONFIG
--    Replace the hardcoded CASE statement with a table lookup.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.calculate_delivery_price(
  vehicle_type text,
  pickup_lat double precision,
  pickup_lng double precision,
  dropoff_lat double precision,
  dropoff_lng double precision
)
RETURNS numeric
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  dlat     float8 := radians(dropoff_lat - pickup_lat);
  dlng     float8 := radians(dropoff_lng - pickup_lng);
  a        float8;
  dist_km  float8;
  base_fare  numeric;
  per_km     numeric;
BEGIN
  -- Haversine distance
  a       := sin(dlat/2)^2 + cos(radians(pickup_lat)) * cos(radians(dropoff_lat)) * sin(dlng/2)^2;
  dist_km := 6371 * 2 * atan2(sqrt(a), sqrt(1 - a));

  -- Look up from PRICING_CONFIG, fall back to defaults
  SELECT "BASE_FARE", "PER_KM_RATE"
    INTO base_fare, per_km
    FROM public."PRICING_CONFIG"
   WHERE lower("VEHICLE_TYPE") = lower(vehicle_type)
   LIMIT 1;

  -- If not found in table, use hardcoded fallback
  IF base_fare IS NULL THEN
    CASE lower(vehicle_type)
      WHEN 'motorcycle' THEN base_fare := 40;  per_km := 10;
      WHEN 'car'        THEN base_fare := 100; per_km := 15;
      WHEN 'truck'      THEN base_fare := 200; per_km := 25;
      ELSE                   base_fare := 40;  per_km := 10;
    END CASE;
  END IF;

  RETURN round((base_fare + (per_km * dist_km))::numeric, 2);
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. OPTIONAL: Enforce driver approval in get_pending_orders
--    Modify the RPC to only show orders to approved drivers.
--    (Only needed if you want server-side enforcement)
-- ─────────────────────────────────────────────────────────────
-- You would add this condition to get_pending_orders:
--   AND EXISTS (
--     SELECT 1 FROM public."PROFILE"
--     WHERE "ID" = p_driver_id AND "IS_APPROVED" = true
--   )

-- ─────────────────────────────────────────────────────────────
-- 6. APP CONFIG TABLE
--    Generic key-value store for runtime app settings.
--    Used by the admin panel (write) and mobile app (read).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "APP_CONFIG" (
  "KEY"         text PRIMARY KEY,
  "VALUE"       text NOT NULL,
  "DESCRIPTION" text,
  "UPDATED_AT"  timestamptz DEFAULT now()
);

-- Seed default delivery radius (100 meters)
INSERT INTO "APP_CONFIG" ("KEY", "VALUE", "DESCRIPTION") VALUES
  ('delivery_radius_meters', '100', 'Radius in meters within which a driver can mark a delivery as complete')
ON CONFLICT ("KEY") DO NOTHING;

-- Enable RLS
ALTER TABLE "APP_CONFIG" ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (mobile app needs this)
DROP POLICY IF EXISTS "app_config_read" ON "APP_CONFIG";
CREATE POLICY "app_config_read" ON "APP_CONFIG"
  FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────────
-- DONE. Verify by running:
--   SELECT * FROM "PRICING_CONFIG";
--   SELECT * FROM "APP_CONFIG";
--   SELECT "ID", "FULL_NAME", "IS_APPROVED" FROM "PROFILE" WHERE "ROLE" = 'DRIVER';
--   SELECT "ID", "PLATE", "IS_APPROVED" FROM "VEHICLE";
-- ─────────────────────────────────────────────────────────────
