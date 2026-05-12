-- Add auto_models column to providers table
-- Stores comma-separated model IDs for "auto" model resolution
-- Empty string = randomly pick from the provider's full models list
-- Comma-separated values = randomly pick from the specified subset

ALTER TABLE providers ADD COLUMN auto_models TEXT DEFAULT '';
