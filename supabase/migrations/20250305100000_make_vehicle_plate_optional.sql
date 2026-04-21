-- Make VEHICLE.PLATE optional so drivers can register without a plate number.
ALTER TABLE "VEHICLE"
  ALTER COLUMN "PLATE" DROP NOT NULL;
