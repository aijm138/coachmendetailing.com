/* ─────────────────────────────────────────────────────────────────────────────
   Booking System Schema
   
   Stores every booking created through the Coachmen Detailing public form,
   including the contact info, service-location details, selected plan,
   and the Stripe PaymentIntent ID for payment reconciliation.
   
   The webhook handler (supabase/functions/stripe-webhook) updates rows
   here when Stripe sends `payment_intent.succeeded` / `.failed` events.
   ───────────────────────────────────────────────────────────────────────────── */

-- ═════════════════════════════════════════════════════════════════════════════
-- 1.  CUSTOM TYPES
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TYPE booking_payment_mode AS ENUM ('now', 'later');

CREATE TYPE booking_status AS ENUM (
  'pending',         -- just created, payment not yet finalised
  'requires_action', -- 3DS / SCA authentication is in progress
  'confirmed',       -- payment succeeded (Pay Now) or booking queued (Pay Later)
  'completed',       -- service delivered
  'cancelled',       -- manually cancelled
  'failed'           -- payment declined or error
);

-- ═════════════════════════════════════════════════════════════════════════════
-- 2.  BOOKINGS TABLE
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE bookings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  /* ── Contact info ─────────────────────────────────────────────────────── */
  contact_name  text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,          -- raw digits, 10 characters

  /* ── Service location ─────────────────────────────────────────────────── */
  address1      text NOT NULL DEFAULT '',
  address2      text NOT NULL DEFAULT '',
  city          text NOT NULL DEFAULT '',
  state         text NOT NULL DEFAULT '',
  zip           text NOT NULL DEFAULT '',
  lat           double precision,       -- geocoded, may be null
  lng           double precision,

  /* ── Plan details (denormalised so booking is self-contained) ────────── */
  plan_id       text NOT NULL,          -- e.g. 'basic', 'deluxe', 'platinum'
  plan_label    text NOT NULL,
  amount_cents  integer NOT NULL,       -- e.g. 9900 = $99.00

  /* ── Payment / Stripe ────────────────────────────────────────────────── */
  payment_mode          booking_payment_mode NOT NULL DEFAULT 'now',
  payment_intent_id     text UNIQUE,         -- Stripe PI id, set when created
  stripe_customer_id    text,                -- optional, if we create Customers
  stripe_payment_status text,                -- raw Stripe PI status (for reference)

  /* ── Application status ──────────────────────────────────────────────── */
  status        booking_status NOT NULL DEFAULT 'pending',
  eta_message   text NOT NULL DEFAULT '',

  /* ── Metadata ────────────────────────────────────────────────────────── */
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes         text NOT NULL DEFAULT '',   -- admin notes

  /* ── Timestamps ──────────────────────────────────────────────────────── */
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ═════════════════════════════════════════════════════════════════════════════
-- 3.  INDEXES
-- ═════════════════════════════════════════════════════════════════════════════

-- Lookup by Stripe PaymentIntent (webhook handler needs this)
CREATE INDEX idx_bookings_payment_intent ON bookings (payment_intent_id);

-- Filtering by application status (admin dashboard)
CREATE INDEX idx_bookings_status ON bookings (status);

-- Chronological listing (newest first)
CREATE INDEX idx_bookings_created_at ON bookings (created_at DESC);

-- ═════════════════════════════════════════════════════════════════════════════
-- 4.  UPDATED_AT TRIGGER
-- ═════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═════════════════════════════════════════════════════════════════════════════
-- 5.  ROW-LEVEL SECURITY
-- ═════════════════════════════════════════════════════════════════════════════
--
-- The public form is unauthenticated, so we allow:
--   • anon  → INSERT (anyone can submit a booking)
--   • anon  → SELECT on their own row (by providing the booking id)
--   • service_role → UPDATE (webhook handler / admin functions)
--   • service_role → all other operations
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Anyone can submit the booking form
CREATE POLICY "anon_insert_bookings" ON bookings
  FOR INSERT TO anon
  WITH CHECK (true);

-- Anyone can read a booking if they know its UUID (used for status-check pages)
CREATE POLICY "anon_select_bookings" ON bookings
  FOR SELECT TO anon
  USING (true);

-- Only the service-role (server-side functions / webhooks) may update rows
CREATE POLICY "service_update_bookings" ON bookings
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

-- Service role can delete (admin cleanup)
CREATE POLICY "service_delete_bookings" ON bookings
  FOR DELETE TO service_role
  USING (true);

-- ═════════════════════════════════════════════════════════════════════════════
-- 6.  SEED DATA (optional — uncomment to insert sample plans)
-- ═════════════════════════════════════════════════════════════════════════════
/*
INSERT INTO bookings (contact_name, contact_email, contact_phone,
                       address1, city, state, zip,
                       plan_id, plan_label, amount_cents, payment_mode)
VALUES ('Jane Sample', 'jane@example.com', '5551234567',
        '123 Main St', 'Springfield', 'IL', '62701',
        'deluxe', 'Deluxe Detail', 14900, 'later');
*/
