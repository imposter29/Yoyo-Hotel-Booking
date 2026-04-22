# ER Diagram — Yoyo Hotel Booking & Yield Pricing System

## Collections Overview

| Collection | Purpose |
|------------|---------|
| `users` | Guests, hotel admins, and the superadmin |
| `hotels` | Hotel listings (with approval workflow) |
| `roomtypes` | Room categories per hotel |
| `rooms` | Physical room entities |
| `inventorycalendars` | Per-day availability tracking per room type |
| `pricingrules` | DB-driven rules for the yield pricing engine |
| `bookings` | Booking state machine (hold → confirmed) |
| `payments` | Payment records linked to bookings |
| `reviews` | Guest reviews linked to hotels and bookings |
| `deals` | Promo codes / coupon deals created by superadmin |
| `newsletters` | Email subscriber list |

---

## Mermaid ER Diagram

```mermaid
erDiagram

    USERS {
        ObjectId  id           PK
        string    email
        string    passwordHash
        string    firstName
        string    lastName
        string    phone
        string    role         "guest | hotel_admin | superadmin"
        boolean   isActive
        datetime  createdAt
        datetime  updatedAt
    }

    HOTELS {
        ObjectId  id            PK
        ObjectId  managedBy     FK
        string    name
        object    address       "city, state, country, postalCode"
        object    location      "GeoJSON Point"
        int       starRating
        float     averageRating
        int       reviewCount
        string[]  amenities
        object[]  images        "url, caption, isPrimary"
        object    policies      "checkIn/Out times, petFriendly, smokingAllowed"
        string    contactEmail
        string    contactPhone
        boolean   isApproved
        boolean   isActive
        datetime  createdAt
        datetime  updatedAt
    }

    ROOM_TYPES {
        ObjectId  id                  PK
        ObjectId  hotel               FK
        string    name
        string    description
        int       maxOccupancy
        decimal   baseRatePerNight
        string    currency
        string[]  amenities
        object[]  bedConfiguration    "bedType, count"
        object[]  images              "url, caption"
        object    cancellationPolicy  "freeCancellationHours, tiers[]"
        boolean   isActive
        datetime  createdAt
        datetime  updatedAt
    }

    ROOMS {
        ObjectId  id          PK
        ObjectId  hotel       FK
        ObjectId  roomType    FK
        string    roomNumber
        int       floor
        string    status      "available | maintenance"
        boolean   isActive
        datetime  createdAt
    }

    INVENTORY_CALENDAR {
        ObjectId  id             PK
        ObjectId  roomType       FK
        ObjectId  hotel          FK
        date      date
        int       totalRooms
        int       availableCount
        int       heldCount
        int       bookedCount
        float     demandIndex    "0–1, updated by nightly cron"
        datetime  updatedAt
    }

    PRICING_RULES {
        ObjectId  id              PK
        ObjectId  roomType        FK
        ObjectId  hotel           FK
        string    name
        string    ruleType        "seasonal|demand|occupancy|length_of_stay|early_bird|last_minute"
        decimal   multiplier
        int       priority
        object    conditions      "startDate, endDate, minDemandIndex, minOccupancyPercent, minNights, daysBeforeCheckIn, etc."
        date      effectiveFrom
        date      effectiveTo
        boolean   isActive
        datetime  createdAt
        datetime  updatedAt
    }

    BOOKINGS {
        ObjectId  id                 PK
        ObjectId  guest              FK
        ObjectId  hotel              FK
        string    status             "hold|confirmed|checked_in|checked_out|cancelled|expired"
        date      checkIn
        date      checkOut
        int       totalNights
        int       guestCount
        decimal   totalAmount
        string    currency
        string    referenceNumber
        string    guestRequests
        string    cancellationReason
        datetime  holdExpiresAt
        datetime  confirmedAt
        datetime  cancelledAt
        object[]  items              "room, roomType, nights, basePricePerNight, finalPricePerNight, pricingBreakdown"
        datetime  createdAt
        datetime  updatedAt
    }

    PAYMENTS {
        ObjectId  id                PK
        ObjectId  booking           FK
        ObjectId  guest             FK
        decimal   amount
        decimal   discountAmount    "Applied promo code discount"
        string    promoCode         "Promo code used (if any)"
        string    currency
        string    status            "pending|completed|failed|refunded"
        string    gatewayChargeId
        string    gatewayProvider
        string    paymentMethod
        decimal   refundedAmount
        datetime  paidAt
        datetime  refundedAt
        datetime  createdAt
    }

    REVIEWS {
        ObjectId  id        PK
        ObjectId  hotel     FK
        ObjectId  guest     FK
        ObjectId  booking   FK
        int       rating    "1–5"
        string    title
        string    comment
        datetime  createdAt
    }

    DEALS {
        ObjectId  id           PK
        ObjectId  createdBy    FK
        string    title
        string    code         "Unique promo code (uppercase)"
        string    subtitle
        string    tag
        string    type         "insta_stays|weekend|early_bird|last_minute|seasonal|custom"
        number    discount     "Percentage 0–100"
        string    cta          "Call-to-action label"
        string    ctaUrl       "CTA link"
        string    bgColor      "Card background colour"
        string    appStoreUrl
        string    playStoreUrl
        boolean   isActive
        datetime  expiresAt
        datetime  createdAt
        datetime  updatedAt
    }

    NEWSLETTERS {
        ObjectId  id            PK
        string    email
        datetime  subscribedAt
    }

    %% Relationships
    USERS        ||--o{ HOTELS              : "manages"
    USERS        ||--o{ BOOKINGS            : "places"
    USERS        ||--o{ REVIEWS             : "writes"
    USERS        ||--o{ PAYMENTS            : "makes"
    USERS        ||--o{ DEALS               : "creates"

    HOTELS       ||--o{ ROOM_TYPES          : "has"
    HOTELS       ||--o{ ROOMS               : "contains"
    HOTELS       ||--o{ PRICING_RULES       : "defines"
    HOTELS       ||--o{ REVIEWS             : "receives"
    HOTELS       ||--o{ INVENTORY_CALENDAR  : "tracks"

    ROOM_TYPES   ||--o{ ROOMS               : "categorizes"
    ROOM_TYPES   ||--o{ PRICING_RULES       : "governed_by"
    ROOM_TYPES   ||--o{ INVENTORY_CALENDAR  : "per_date"

    BOOKINGS     ||--|{ BOOKING_ITEMS        : "contains"
    BOOKINGS     ||--o| PAYMENTS             : "paid_via"
    BOOKINGS     ||--o{ REVIEWS              : "linked_to"

    ROOMS        }o--|| ROOM_TYPES           : "belongs_to"
```

---

## Key Relationships Explained

| Relationship | Cardinality | Notes |
|---|---|---|
| User → Hotels | 1..* | A `hotel_admin` manages multiple hotels |
| Hotel → RoomTypes | 1..* | Each hotel has at least one room type |
| RoomType → InventoryCalendar | 1 per day | One document per `(roomType, date)` pair |
| RoomType → PricingRules | 0..* | Rules drive the YieldPricingEngine multipliers |
| Booking → Payment | 1..1 | Each confirmed booking has one payment record |
| Payment → Deals | via `promoCode` field | Code validated against `DEALS.code` at payment time |
| User → Deals | superadmin creates | Only `superadmin` role can create/update/delete deals |
