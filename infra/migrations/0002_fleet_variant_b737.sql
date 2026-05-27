-- 0002_fleet_variant_b737.sql
--
-- Additive enum extension: allow `fleet_variant` to take the value 'B737'
-- so a Boeing 737NG demo fleet can be modelled in DB (ADR 0006 reserves the
-- enum-extension migration for the moment a non-Fokker operator deployment
-- lands; this is that moment, scoped to the demo seed for now).
--
-- The AircraftTypeProfile registry already carries B737_PROFILE in preview
-- status — operational technique and AI calibration remain
-- `pendingPrimarySource = true` until populated by a B737-qualified TRI/TRE.
--
-- Postgres ALTER TYPE ... ADD VALUE is non-transactional but reversible only
-- by recreating the enum. We accept that trade-off; the value is additive
-- and no existing row references it.

ALTER TYPE fleet_variant ADD VALUE IF NOT EXISTS 'B737';
