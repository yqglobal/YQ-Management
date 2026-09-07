-- Clear out the default 'Created during setup' descriptions from services
UPDATE "Service" SET description = '' WHERE description = 'Created during setup';