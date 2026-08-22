/*
# Add budget_limit column to trips table

1. Modified Tables
- `trips` — added `budget_limit` (numeric, nullable) so users can set a target budget for their trip.
  This column is optional; existing and new trips default to NULL (no budget limit set).
2. Security
- No RLS policy changes. The column is user-writable via the existing UPDATE policy on trips.
3. Notes
- The column is nullable so it does not break existing rows.
- No default value — a NULL means "no budget limit set."
*/

ALTER TABLE trips
ADD COLUMN IF NOT EXISTS budget_limit numeric;
