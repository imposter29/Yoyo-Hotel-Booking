# ER Diagram — Hotel Room Booking & Yield Pricing System

## Mermaid ER Diagram

```mermaid
erDiagram

USERS {
    ObjectId id PK
    string email
    string passwordHash
    string firstName
    string lastName
    string phone
    string role "guest | hotel_admin | superadmin"
    boolean isActive
    datetime createdAt
    datetime updatedAt
}

HOTELS {
    ObjectId id PK
    ObjectId managedBy FK
    string name
    object address "city, state, country, pincode"
    int starRating
    float averageRating
    int reviewCount
    string[] amenities
    object[] images "url, caption, isPrimary"
    string contactEmail
    string contactPhone
    boolean isApproved
    boolean isActive
    datetime createdAt
    datetime updatedAt
}

ROOM_TYPES {
    ObjectId id PK
    ObjectId hotel FK
    string name
    string description
    int maxOccupancy
    decimal baseRatePerNight
    string currency
    string[] amenities
    object[] bedConfiguration "bedType, count"
    object[] images "url, caption"
    object cancellationPolicy "freeCancellationHours, tiers[]"
    boolean isActive
    datetime createdAt
    datetime updatedAt
}

ROOMS {
    ObjectId id PK
    ObjectId hotel FK
    ObjectId roomType FK
    string roomNumber
    int floor
    boolean isActive
    datetime createdAt
}

INVENTORY_CALENDAR {
    ObjectId id PK
    ObjectId roomType FK
    ObjectId hotel FK
    date date
    int totalRooms
    int availableCount
    int heldCount
    int bookedCount
    float demandIndex "0-1 updated by nightly cron"
    datetime updatedAt
}

PRICING_RULES {
    ObjectId id PK
    ObjectId roomType FK
    ObjectId hotel FK
    string name
    string ruleType "seasonal | demand | occupancy | length_of_stay | early_bird | last_minute"
    decimal multiplier
    int priority
    object conditions "startDate, endDate, minDemandIndex, minOccupancyPercent, minNights, etc."
    date effectiveFrom
    date effectiveTo
    boolean isActive
    datetime createdAt
    datetime updatedAt
}

BOOKINGS {
    ObjectId id PK
    ObjectId guest FK
    ObjectId hotel FK
    string status "hold | confirmed | checked_in | checked_out | cancelled | expired"
    date checkIn
    date checkOut
    int totalNights
    int guestCount
    decimal totalAmount
    string currency
    string referenceNumber
    string guestRequests
    string cancellationReason
    datetime holdExpiresAt
    datetime confirmedAt
    datetime cancelledAt
    object[] items "room, roomType, nights, basePricePerNight, finalPricePerNight, pricingBreakdown"
    datetime createdAt
    datetime updatedAt
}

PAYMENTS {
    ObjectId id PK
    ObjectId booking FK
    ObjectId guest FK
    decimal amount
    string currency
    string status "pending | completed | failed | refunded"
    string gatewayChargeId
    string gatewayProvider
    string paymentMethod
    decimal refundedAmount
    datetime paidAt
    datetime refundedAt
    datetime createdAt
}

REVIEWS {
    ObjectId id PK
    ObjectId hotel FK
    ObjectId guest FK
    ObjectId booking FK
    int rating "1-5"
    string title
    string comment
    datetime createdAt
}

DEALS {
    ObjectId id PK
    ObjectId hotel FK
    string title
    string description
    decimal discountPercent
    date validFrom
    date validTo
    boolean isActive
}

CITIES {
    ObjectId id PK
    string name
    string country
    string imageUrl
    boolean isPopular
}

NEWSLETTER {
    ObjectId id PK
    string email
    datetime subscribedAt
}

USERS ||--o{ HOTELS : manages
USERS ||--o{ BOOKINGS : places
USERS ||--o{ REVIEWS : writes
USERS ||--o{ PAYMENTS : makes

HOTELS ||--o{ ROOM_TYPES : has
HOTELS ||--o{ ROOMS : contains
HOTELS ||--o{ PRICING_RULES : defines
HOTELS ||--o{ REVIEWS : receives
HOTELS ||--o{ DEALS : offers
HOTELS ||--o{ INVENTORY_CALENDAR : tracks

ROOM_TYPES ||--o{ ROOMS : categorizes
ROOM_TYPES ||--o{ PRICING_RULES : governed_by
ROOM_TYPES ||--o{ INVENTORY_CALENDAR : per_date

BOOKINGS ||--|{ BOOKING_ITEMS : contains
BOOKINGS ||--o| PAYMENTS : paid_via
BOOKINGS ||--o{ REVIEWS : linked_to

ROOMS }o--|| ROOM_TYPES : belongs_to
```
