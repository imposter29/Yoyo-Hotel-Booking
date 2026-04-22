# Sequence Diagram — Yoyo Hotel Booking & Yield Pricing System

## 1. Main Booking Flow (Check → Hold → Payment → Confirmed)

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

    Customer->>BookingController: POST /api/bookings/check (roomTypeId, checkIn, checkOut)
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

    Note over YieldPricingEngine, PricingStrategy: Strategy Pattern + Polymorphism
    loop For each loaded strategy
        YieldPricingEngine->>PricingStrategy: strategy.apply(context)
        PricingStrategy-->>YieldPricingEngine: multiplier (e.g. 1.4)
    end

    YieldPricingEngine->>YieldPricingEngine: finalPrice = baseRate × ∏(multipliers)
    YieldPricingEngine-->>BookingController: PricingResult { pricePerNight, totalPrice, breakdown }

    BookingController-->>Customer: 200 OK { available, pricing }

    Customer->>BookingController: POST /api/bookings (roomTypeId, checkIn, checkOut, guestCount)
    BookingController->>AvailabilityService: reserveRoom(roomTypeId, checkIn, checkOut)
    AvailabilityService->>DB: Find available Room + update InventoryCalendar (heldCount++)
    DB-->>AvailabilityService: reservedRoom
    AvailabilityService-->>BookingController: room

    BookingController->>YieldPricingEngine: computePrice(roomTypeId, checkIn, checkOut)
    YieldPricingEngine-->>BookingController: PricingResult

    BookingController->>DB: Booking.create({ status: "hold", holdExpiresAt: NOW+15min, items[] })
    DB-->>BookingController: booking { _id, referenceNumber }
    BookingController-->>Customer: 201 Created { bookingId, status: hold, totalAmount }

    Customer->>BookingController: POST /api/payments/initiate (bookingId, paymentMethod)
    BookingController->>DB: Validate hold not expired
    BookingController->>DB: Payment.create({ status: pending })
    BookingController-->>Customer: 200 OK { paymentId }

    Customer->>BookingController: POST /api/payments/:paymentId/confirm
    BookingController->>DB: Payment.updateOne({ status: completed, paidAt: now })
    BookingController->>DB: Booking.transitionTo("confirmed")

    Note right of NotificationService: Observer Pattern — async EventEmitter
    BookingController->>NotificationService: emit("booking.confirmed", { bookingId, guest })
    NotificationService->>NotificationService: sendConfirmationEmail(guest.email)

    BookingController-->>Customer: 200 OK { bookingId, status: confirmed }
```

---

## 2. Promo Code Validation Flow

```mermaid
sequenceDiagram
    actor Customer
    participant PaymentPage
    participant PaymentController
    participant DB

    Customer->>PaymentPage: Enters promo code (e.g. "SAVE20")
    PaymentPage->>PaymentController: POST /api/payments/validate-promo { code, bookingId }
    PaymentController->>PaymentController: Authenticate JWT

    PaymentController->>DB: Deal.findOne({ code: "SAVE20", isActive: true })
    DB-->>PaymentController: deal | null

    alt Deal not found or expired
        PaymentController-->>PaymentPage: 400 Bad Request { message: "Invalid or expired promo code" }
        PaymentPage-->>Customer: Show error toast
    else Deal valid
        PaymentController->>PaymentController: Compute discountAmount = totalAmount × (discount/100)
        PaymentController-->>PaymentPage: 200 OK { discount, discountAmount, finalAmount }
        PaymentPage-->>Customer: Show discounted total
    end

    Customer->>PaymentController: POST /api/payments/:id/confirm { promoCode }
    PaymentController->>DB: Payment.update({ discountAmount, promoCode })
    PaymentController->>DB: Booking.transitionTo("confirmed")
    PaymentController-->>Customer: 200 OK { status: confirmed }
```

---

## 3. Hold Expiry Background Job

```mermaid
sequenceDiagram
    participant HoldExpiryJob
    participant DB
    participant InventoryCalendar

    Note over HoldExpiryJob: Runs every 5 minutes via node-cron
    HoldExpiryJob->>DB: Find bookings { status: "hold", holdExpiresAt < now }
    DB-->>HoldExpiryJob: expiredBookings[]
    loop For each expired booking
        HoldExpiryJob->>DB: Booking.transitionTo("expired")
        HoldExpiryJob->>InventoryCalendar: availableCount++, heldCount--
    end
```

---

## 4. Hotel Approval Flow (Hotel Admin → SuperAdmin)

```mermaid
sequenceDiagram
    actor HotelAdmin
    actor SuperAdmin
    participant HotelController
    participant AdminController
    participant DB

    HotelAdmin->>HotelController: POST /api/hotels/submit (hotelData)
    HotelController->>DB: Hotel.create({ isApproved: false, isActive: false })
    DB-->>HotelController: hotel { _id }
    HotelController-->>HotelAdmin: 201 Created { hotel, status: "pending" }

    SuperAdmin->>AdminController: GET /api/admin/hotels/pending
    AdminController->>DB: Hotel.find({ isApproved: false })
    DB-->>AdminController: pendingHotels[]
    AdminController-->>SuperAdmin: pendingHotels[]

    SuperAdmin->>AdminController: PATCH /api/admin/hotels/:hotelId/approve
    AdminController->>DB: Hotel.updateOne({ isApproved: true, isActive: true })
    AdminController-->>SuperAdmin: 200 OK { hotel }
```
