# Sequence Diagram — Hotel Room Booking & Yield Pricing System

## Main Booking Flow

```mermaid
sequenceDiagram
    actor Customer
    participant BookingController
    participant AvailabilityService
    participant YieldPricingEngine
    participant PricingStrategyFactory
    participant PricingStrategy
    participant NotificationService
    participant DB

    Customer->>BookingController: POST /api/v1/bookings/check (roomTypeId, checkIn, checkOut)
    BookingController->>BookingController: Validate JWT + Request Schema (Joi)

    BookingController->>AvailabilityService: checkAvailability(roomTypeId, checkIn, checkOut)
    AvailabilityService->>DB: Query InventoryCalendar for date range
    DB-->>AvailabilityService: inventory records
    AvailabilityService-->>BookingController: available: true/false

    BookingController->>YieldPricingEngine: computePrice(roomTypeId, checkIn, checkOut)

    YieldPricingEngine->>DB: RoomType.findById(roomTypeId) → baseRate
    DB-->>YieldPricingEngine: roomType { baseRatePerNight }

    YieldPricingEngine->>DB: InventoryCalendar.findOne() → occupancy & demandIndex
    DB-->>YieldPricingEngine: { occupancyPercent, demandIndex }

    YieldPricingEngine->>DB: PricingRule.find({ roomType, isActive }) sorted by priority
    DB-->>YieldPricingEngine: pricingRules[]

    Note over YieldPricingEngine, PricingStrategyFactory: Factory Pattern
    loop For each PricingRule
        YieldPricingEngine->>PricingStrategyFactory: create(rule)
        PricingStrategyFactory-->>YieldPricingEngine: ConcreteStrategy instance
    end

    Note over YieldPricingEngine, PricingStrategy: Strategy + Polymorphism
    loop For each loaded strategy
        YieldPricingEngine->>PricingStrategy: strategy.apply(context)
        PricingStrategy-->>YieldPricingEngine: multiplier (e.g. 1.4)
    end

    YieldPricingEngine->>YieldPricingEngine: finalPrice = baseRate × ∏(multipliers)
    YieldPricingEngine-->>BookingController: PricingResult { pricePerNight, totalPrice, breakdown }

    BookingController-->>Customer: 200 OK { available, pricing }

    Customer->>BookingController: POST /api/v1/bookings (roomTypeId, checkIn, checkOut, guestCount)
    BookingController->>AvailabilityService: reserveRoom(roomTypeId, checkIn, checkOut)
    AvailabilityService->>DB: Find available Room + update InventoryCalendar
    DB-->>AvailabilityService: reservedRoom
    AvailabilityService-->>BookingController: room

    BookingController->>YieldPricingEngine: computePrice(roomTypeId, checkIn, checkOut)
    YieldPricingEngine-->>BookingController: PricingResult

    BookingController->>DB: Booking.create({ status: "hold", holdExpiresAt: NOW+15min, items[] })
    DB-->>BookingController: booking { _id, referenceNumber }
    BookingController-->>Customer: 201 Created { bookingId, status: hold, totalAmount }

    Customer->>BookingController: POST /api/v1/payments (bookingId, paymentMethod)
    BookingController->>DB: Validate hold not expired
    BookingController->>DB: Payment.create({ status: completed })
    BookingController->>DB: Booking.transitionTo("confirmed")

    Note right of NotificationService: Observer Pattern — async EventEmitter
    BookingController->>NotificationService: emit("booking.confirmed", { bookingId, guest })
    NotificationService->>NotificationService: sendConfirmationEmail(guest.email)

    BookingController-->>Customer: 200 OK { bookingId, status: confirmed }
```

## Hold Expiry Background Job

```mermaid
sequenceDiagram
    participant HoldExpiryJob
    participant DB
    participant InventoryCalendar

    Note over HoldExpiryJob: Runs every 5 minutes via node-cron
    HoldExpiryJob->>DB: Find bookings { status: hold, holdExpiresAt < now }
    DB-->>HoldExpiryJob: expiredBookings[]
    loop For each expired booking
        HoldExpiryJob->>DB: Booking.transitionTo("expired")
        HoldExpiryJob->>InventoryCalendar: Restore availableCount, decrement heldCount
    end
```
