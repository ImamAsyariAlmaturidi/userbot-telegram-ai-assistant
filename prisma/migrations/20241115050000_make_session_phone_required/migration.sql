-- Update existing NULL values first (set default values for existing records)
-- Update phone_number: set to empty string if NULL
UPDATE "users" SET "phone_number" = '' WHERE "phone_number" IS NULL;

-- Update session: set to empty string if NULL
UPDATE "users" SET "session" = '' WHERE "session" IS NULL;

-- Make phone_number NOT NULL
ALTER TABLE "users" ALTER COLUMN "phone_number" SET NOT NULL;

-- Make session NOT NULL
ALTER TABLE "users" ALTER COLUMN "session" SET NOT NULL;

