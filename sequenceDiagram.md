# Sequence Diagram — Hotel Room Booking & Yield Pricing System

## Main Booking Flow

End-to-end flow: Guest submits booking → availability check → yield pricing → hold → payment → confirmation → invoice → notification.

---

## PlantUML Sequence Diagram

```plantuml
@startuml

actor "Guest" as Client

participant "BookingController" as BC
participant "AvailabilityService" as AS
participant "YieldPricingEngine" as YPE
participant "PricingStrategyFactory" as PSF
participant "SeasonalStrategy" as SS
participant "DemandStrategy" as DS
participant "OccupancyStrategy" as OS
participant "BookingService" as BS
participant "PaymentService" as PS
participant "InvoiceService" as IS
participant "NotificationService" as NS
participant "InventoryRepository" as IR
participant "BookingRepository" as BR
participant "PricingRuleRepository" as PRR
participant "PaymentGateway" as PGW

== Phase 1: Request Validation ==

Client -> BC : POST /api/bookings\n{ hotelId, roomTypeId, checkIn, checkOut, guests, addOns[] }
BC -> BC : validateJWT(token)
BC -> BC : validateRequestSchema(body)

== Phase 2: Availability Check ==

BC -> AS : checkAvailability(roomTypeId, checkIn, checkOut)
AS -> IR : queryInventory(roomTypeId, checkIn, checkOut)\nFOR UPDATE
IR --> AS : inventoryRecords[]
AS -> AS : validateAllDatesAvailable()
AS -> AS : selectBestAvailableRoom()
AS --> BC : { roomId }

== Phase 3: Yield Pricing Computation ==

BC -> YPE : computePrice(roomTypeId, checkIn, checkOut)
YPE -> PRR : loadActivePricingRules(roomTypeId, checkIn, checkOut)
PRR --> YPE : pricingRules[]
YPE -> PRR : loadBaseRate(roomTypeId)
PRR --> YPE : baseRate

YPE -> PSF : createStrategies(pricingRules[])
PSF --> YPE : strategies[]

YPE -> SS : apply(context)
SS --> YPE : adjustedPrice (baseRate × seasonMultiplier)

YPE -> DS : apply(context)
DS --> YPE : adjustedPrice (× demandMultiplier)

YPE -> OS : apply(context)
OS -> IR : getOccupancyRate(roomTypeId, dates)
IR --> OS : occupancyRate
OS --> YPE : adjustedPrice (× occupancyMultiplier)

YPE -> YPE : applyLengthOfStayDiscount()
YPE --> BC : PricingResult { pricePerNight, totalPrice, breakdown }

== Phase 4: Hold Creation ==

BC -> BS : createHold(guestId, roomId, checkIn, checkOut, pricingResult, addOns[])
BS -> BR : beginTransaction()
BS -> IR : decrementInventory(roomId, checkIn, checkOut)
IR --> BS : rowsAffected

alt Race Condition
  BS -> BR : rollbackTransaction()
  BS --> BC : ConcurrencyException
  BC --> Client : 409 Conflict
end

BS -> BR : insertBooking({ status: HOLD, holdExpiresAt: NOW()+15min })
BR --> BS : booking { id, status: HOLD }
BS -> BR : insertBookingItems(bookingId, roomId, pricePerNight)
BS -> BR : insertBookingAddOns(bookingId, addOns[])
BS -> BR : commitTransaction()
BS --> BC : holdResult { bookingId, holdExpiresAt, totalAmount }
BC --> Client : 201 Created { bookingId, status: HOLD, totalAmount, holdExpiresAt }

== Phase 5: Payment ==

Client -> BC : POST /api/payments { bookingId, paymentToken }
BC -> BS : getBooking(bookingId)
BS -> BR : findById(bookingId)
BR --> BS : booking { status: HOLD, holdExpiresAt }
BS --> BC : booking
BC -> BC : validateHoldNotExpired()

BC -> PS : processPayment(bookingId, amount, paymentToken)
PS -> PGW : POST /v1/charges { amount, source: paymentToken }
PGW --> PS : { chargeId, status: succeeded }
PS -> BR : insertPayment({ bookingId, chargeId, status: COMPLETED })
PS --> BC : PaymentResult { paymentId, chargeId }

== Phase 6: Booking Confirmation ==

BC -> BS : confirmBooking(bookingId, paymentId)
BS -> BR : findById(bookingId)
BR --> BS : booking { status: HOLD }
BS -> BS : validateStateTransition(HOLD → CONFIRMED)
BS -> BR : updateBookingStatus(bookingId, CONFIRMED)
BR --> BS : updatedBooking { status: CONFIRMED }
BS --> BC : confirmedBooking

== Phase 7: Invoice Generation ==

BC -> IS : generateInvoice(bookingId)
IS -> BR : getBookingWithItems(bookingId)
BR --> IS : booking { items[], addOns[], payment }
IS -> IS : computeLineItems()
IS -> IS : computeTaxes()
IS -> BR : insertInvoice({ invoiceNumber, subtotal, taxes, total })
IS --> BC : invoice { invoiceId, invoiceNumber }

== Phase 8: Async Notification ==

BC -> NS : emit('booking.confirmed', { bookingId, guestId })
note right of NS : Non-blocking EventEmitter
NS -> NS : renderEmailTemplate()
NS -> NS : sendEmail(guestEmail)

BC --> Client : 200 OK { bookingId, status: CONFIRMED, invoiceId, totalAmount }

== Background: Hold Expiry (Every 5 min) ==

participant "HoldExpiryJob" as HEJ

HEJ -> BR : findExpiredHolds()\nWHERE status=HOLD AND hold_expires_at < NOW()
BR --> HEJ : expiredBookings[]

loop for each expiredBooking
  HEJ -> BS : expireHold(bookingId)
  BS -> BR : updateStatus(bookingId, EXPIRED)
  BS -> IR : restoreInventory(roomId, dates)
  BS -> NS : emit('booking.expired', { bookingId })
end

@enduml
```

---

## Flow Summary

| Phase | Action | Pattern |
|-------|--------|---------|
| 1 | JWT auth + schema validation | Guard Clause |
| 2 | Per-day inventory query with `FOR UPDATE` | Optimistic Locking |
| 3 | Multi-strategy price computation | Strategy + Factory |
| 4 | Atomic inventory decrement + booking insert | Unit of Work |
| 5 | Payment gateway abstraction | Adapter |
| 6 | State machine: HOLD → CONFIRMED | State Pattern |
| 7 | Line-item invoice generation | Builder |
| 8 | Async event notification | Observer |
| BG | Scheduled hold expiry + inventory restore | Scheduler |
