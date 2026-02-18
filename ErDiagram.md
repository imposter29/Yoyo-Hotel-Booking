# 📄 ErDiagram.md — Hotel Room Booking & Yield Pricing System

---

## 1. Schema Overview

The database schema follows **3NF (Third Normal Form)** normalization. Key design decisions:

- **`room_inventory_daily`**: One row per room-type per date — enables atomic inventory operations and prevents double-booking via row-level locking
- **`booking_items`**: Separates the booking header from individual room reservations — supports multi-room bookings
- **`pricing_rules`**: Decoupled from room types — allows multiple rules per room type with priority ordering
- **`seasons`**: Referenced by pricing rules — allows season definitions to be reused across multiple rule configurations
- **`booking_addons`**: Junction table between bookings and add-on services with quantity and price snapshot

---

## 2. Mermaid ER Diagram

```mermaid
erDiagram

    %% ─────────────────────────────────────────
    %% USERS
    %% ─────────────────────────────────────────
    users {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar first_name
        varchar last_name
        varchar phone
        enum role "GUEST | ADMIN | SUPER_ADMIN"
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    %% ─────────────────────────────────────────
    %% HOTELS
    %% ─────────────────────────────────────────
    hotels {
        uuid id PK
        varchar name
        text address
        varchar city
        varchar state
        varchar country
        varchar postal_code
        integer star_rating
        varchar contact_email
        varchar contact_phone
        text description
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    %% ─────────────────────────────────────────
    %% CANCELLATION POLICIES
    %% ─────────────────────────────────────────
    cancellation_policies {
        uuid id PK
        varchar name
        text description
        integer free_cancellation_hours
        jsonb tiers "Array of { hours_before, refund_pct }"
        timestamp created_at
        timestamp updated_at
    }

    %% ─────────────────────────────────────────
    %% ROOM TYPES
    %% ─────────────────────────────────────────
    room_types {
        uuid id PK
        uuid hotel_id FK
        uuid cancellation_policy_id FK
        varchar name
        text description
        integer max_occupancy
        decimal base_rate_per_night
        jsonb amenities
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    %% ─────────────────────────────────────────
    %% ROOMS
    %% ─────────────────────────────────────────
    rooms {
        uuid id PK
        uuid hotel_id FK
        uuid room_type_id FK
        varchar room_number UK
        integer floor
        text notes
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    %% ─────────────────────────────────────────
    %% ROOM INVENTORY DAILY
    %% ─────────────────────────────────────────
    room_inventory_daily {
        uuid id PK
        uuid room_type_id FK
        date date
        integer total_rooms
        integer available_count
        integer held_count
        integer booked_count
        timestamp updated_at
    }

    %% ─────────────────────────────────────────
    %% SEASONS
    %% ─────────────────────────────────────────
    seasons {
        uuid id PK
        uuid hotel_id FK
        varchar name
        date start_date
        date end_date
        enum season_type "PEAK | OFF_PEAK | SHOULDER"
        boolean is_recurring
        timestamp created_at
        timestamp updated_at
    }

    %% ─────────────────────────────────────────
    %% PRICING RULES
    %% ─────────────────────────────────────────
    pricing_rules {
        uuid id PK
        uuid room_type_id FK
        uuid season_id FK "nullable"
        enum rule_type "SEASONAL | DEMAND | OCCUPANCY | LENGTH_OF_STAY"
        decimal multiplier
        integer priority
        jsonb conditions "e.g. { threshold: 0.8 }"
        date effective_from
        date effective_to
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    %% ─────────────────────────────────────────
    %% BOOKINGS
    %% ─────────────────────────────────────────
    bookings {
        uuid id PK
        uuid guest_id FK
        uuid hotel_id FK
        enum status "HOLD | PENDING_PAYMENT | CONFIRMED | CHECKED_IN | CHECKED_OUT | CANCELLED | EXPIRED | REFUNDED"
        date check_in
        date check_out
        integer total_nights
        decimal total_amount
        decimal refund_amount
        timestamp hold_expires_at
        timestamp confirmed_at
        timestamp cancelled_at
        text cancellation_reason
        timestamp created_at
        timestamp updated_at
    }

    %% ─────────────────────────────────────────
    %% BOOKING ITEMS
    %% ─────────────────────────────────────────
    booking_items {
        uuid id PK
        uuid booking_id FK
        uuid room_id FK
        uuid room_type_id FK
        date check_in
        date check_out
        integer nights
        decimal base_price_per_night
        decimal final_price_per_night
        decimal total_price
        jsonb pricing_breakdown "{ baseRate, seasonMult, demandMult, occupancyMult, losDist, appliedRules[] }"
        timestamp created_at
    }

    %% ─────────────────────────────────────────
    %% ADD-ON SERVICES
    %% ─────────────────────────────────────────
    add_on_services {
        uuid id PK
        uuid hotel_id FK
        varchar name
        text description
        decimal price_per_unit
        varchar unit "per_night | per_person | per_booking"
        varchar category "FOOD | TRANSPORT | WELLNESS | MISC"
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    %% ─────────────────────────────────────────
    %% BOOKING ADD-ONS (Junction)
    %% ─────────────────────────────────────────
    booking_addons {
        uuid id PK
        uuid booking_id FK
        uuid add_on_service_id FK
        integer quantity
        decimal unit_price
        decimal total_price
        timestamp created_at
    }

    %% ─────────────────────────────────────────
    %% PAYMENTS
    %% ─────────────────────────────────────────
    payments {
        uuid id PK
        uuid booking_id FK
        decimal amount
        varchar currency
        enum status "PENDING | COMPLETED | FAILED | REFUNDED | PARTIALLY_REFUNDED"
        varchar gateway_charge_id UK
        varchar gateway_provider "STRIPE | RAZORPAY"
        varchar payment_method "CARD | UPI | NETBANKING | WALLET"
        decimal refunded_amount
        timestamp paid_at
        timestamp refunded_at
        text failure_reason
        timestamp created_at
        timestamp updated_at
    }

    %% ─────────────────────────────────────────
    %% INVOICES
    %% ─────────────────────────────────────────
    invoices {
        uuid id PK
        uuid booking_id FK
        uuid payment_id FK
        varchar invoice_number UK
        varchar guest_name
        varchar guest_email
        jsonb line_items "Array of { description, qty, unit_price, total }"
        decimal subtotal
        decimal tax_rate
        decimal tax_amount
        decimal total_amount
        varchar currency
        varchar download_url
        timestamp issued_at
        timestamp created_at
    }

    %% ─────────────────────────────────────────
    %% RELATIONSHIPS
    %% ─────────────────────────────────────────

    hotels ||--o{ room_types : "has"
    hotels ||--o{ rooms : "contains"
    hotels ||--o{ seasons : "defines"
    hotels ||--o{ add_on_services : "offers"

    room_types ||--o{ rooms : "categorizes"
    room_types ||--o{ room_inventory_daily : "tracks"
    room_types ||--o{ pricing_rules : "governed by"
    room_types }o--|| cancellation_policies : "uses"

    seasons ||--o{ pricing_rules : "referenced by"

    users ||--o{ bookings : "places"
    hotels ||--o{ bookings : "hosts"

    bookings ||--|{ booking_items : "contains"
    bookings ||--o{ booking_addons : "includes"
    bookings ||--o| payments : "paid via"
    bookings ||--o| invoices : "generates"

    booking_items }o--|| rooms : "reserves"
    booking_items }o--|| room_types : "of type"

    booking_addons }o--|| add_on_services : "references"

    payments ||--o| invoices : "linked to"
```

---

## 3. Table Descriptions & Constraints

### `room_inventory_daily`
> **Critical table** — one row per `(room_type_id, date)`. Unique constraint on `(room_type_id, date)`.

```sql
ALTER TABLE room_inventory_daily
  ADD CONSTRAINT uq_inventory_room_date UNIQUE (room_type_id, date);

ALTER TABLE room_inventory_daily
  ADD CONSTRAINT chk_counts_non_negative
    CHECK (available_count >= 0 AND held_count >= 0 AND booked_count >= 0);

ALTER TABLE room_inventory_daily
  ADD CONSTRAINT chk_counts_sum
    CHECK (available_count + held_count + booked_count = total_rooms);
```

### `bookings`
> Status transitions enforced at application layer; DB stores current state only.

```sql
ALTER TABLE bookings
  ADD CONSTRAINT chk_checkout_after_checkin
    CHECK (check_out > check_in);

ALTER TABLE bookings
  ADD CONSTRAINT chk_total_nights_positive
    CHECK (total_nights > 0);
```

### `pricing_rules`
> Multiple rules per room type; applied in `priority` order (lower = higher priority).

```sql
ALTER TABLE pricing_rules
  ADD CONSTRAINT chk_multiplier_positive
    CHECK (multiplier > 0);

ALTER TABLE pricing_rules
  ADD CONSTRAINT chk_effective_dates
    CHECK (effective_to >= effective_from);
```

### `payments`
> One payment per booking (enforced by unique constraint on `booking_id`).

```sql
ALTER TABLE payments
  ADD CONSTRAINT uq_booking_payment UNIQUE (booking_id);
```

---

## 4. Key Indexes

```sql
-- Availability queries (most frequent)
CREATE INDEX idx_inventory_room_type_date
  ON room_inventory_daily (room_type_id, date);

-- Booking lookups by guest
CREATE INDEX idx_bookings_guest_id
  ON bookings (guest_id);

-- Booking status filtering (scheduler jobs)
CREATE INDEX idx_bookings_status_hold_expires
  ON bookings (status, hold_expires_at)
  WHERE status = 'HOLD';

-- Pricing rule lookups
CREATE INDEX idx_pricing_rules_room_type_active
  ON pricing_rules (room_type_id, is_active, priority);

-- Invoice lookup by booking
CREATE INDEX idx_invoices_booking_id
  ON invoices (booking_id);
```

---

## 5. Normalization Notes

| Concern | Decision |
|---------|----------|
| `pricing_breakdown` stored as JSONB in `booking_items` | Denormalized intentionally — price audit trail must be immutable; separate table would require complex joins |
| `tiers` stored as JSONB in `cancellation_policies` | Tiers are always read/written together; JSONB avoids a separate `cancellation_tiers` table for simple cases |
| `amenities` stored as JSONB in `room_types` | Amenities are display-only; no filtering needed; JSONB is appropriate |
| `line_items` stored as JSONB in `invoices` | Invoice is a point-in-time document; line items must not change if booking is modified later |
| `seasons` is a separate table | Seasons are reused across multiple pricing rules; normalization avoids duplication |
