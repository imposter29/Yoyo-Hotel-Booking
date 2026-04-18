# Class Diagram — Hotel Room Booking & Yield Pricing System

## Mermaid Class Diagram

```mermaid
classDiagram

    class User {
        +String id
        +String email
        +String passwordHash
        +String firstName
        +String lastName
        +String phone
        +String role
        +Boolean isActive
        +getFullName() String
        +isAdmin() Boolean
        +validatePassword(plain) Boolean
    }

    class Hotel {
        +String id
        +String name
        +Object address
        +Int starRating
        +Float averageRating
        +Boolean isApproved
        +Boolean isActive
        +getRoomTypes() RoomType[]
        +isOperational() Boolean
    }

    class RoomType {
        +String id
        +String hotelId
        +String name
        +Int maxOccupancy
        +Decimal baseRatePerNight
        +String[] amenities
        +Object cancellationPolicy
        +Boolean isActive
        +getBaseRate() Decimal
        +supportsOccupancy(guests) Boolean
    }

    class Room {
        +String id
        +String hotelId
        +String roomTypeId
        +String roomNumber
        +Int floor
        +Boolean isActive
        +isAvailable(checkIn, checkOut) Boolean
    }

    class InventoryCalendar {
        +String id
        +String roomTypeId
        +Date date
        +Int totalRooms
        +Int availableCount
        +Int heldCount
        +Int bookedCount
        +Float demandIndex
        +getOccupancyPercent() Float
        +isAvailable() Boolean
    }

    class Booking {
        +String id
        +String guestId
        +String hotelId
        +String status
        +Date checkIn
        +Date checkOut
        +Int totalNights
        +Decimal totalAmount
        +DateTime holdExpiresAt
        +Array items
        +transitionTo(newStatus) void
        +isHoldExpired() Boolean
        +canBeCancelled() Boolean
    }

    class Payment {
        +String id
        +String bookingId
        +Decimal amount
        +String currency
        +String status
        +String gatewayChargeId
        +DateTime paidAt
        +isCompleted() Boolean
    }

    class PricingRule {
        +String id
        +String roomTypeId
        +String hotelId
        +String name
        +String ruleType
        +Decimal multiplier
        +Int priority
        +Object conditions
        +Date effectiveFrom
        +Date effectiveTo
        +Boolean isActive
    }

    class PricingStrategy {
        <<abstract>>
        #PricingRule rule
        +apply(context) Number
        +getName() String
        +getPriority() Int
    }

    class SeasonalPricing {
        +apply(context) Number
        +getName() String
        +getPriority() Int
    }

    class DemandPricing {
        +apply(context) Number
        +getName() String
        +getPriority() Int
    }

    class OccupancyPricing {
        +apply(context) Number
        +getName() String
        +getPriority() Int
    }

    class LengthOfStayDiscount {
        +apply(context) Number
        +getName() String
        +getPriority() Int
    }

    class EarlyBirdPricing {
        +apply(context) Number
        +getName() String
        +getPriority() Int
    }

    class LastMinutePricing {
        +apply(context) Number
        +getName() String
        +getPriority() Int
    }

    class PricingStrategyFactory {
        <<static>>
        -Map STRATEGY_MAP
        +create(rule) PricingStrategy
        +getSupportedTypes() String[]
    }

    class YieldPricingEngine {
        -PricingStrategy[] strategies
        +loadStrategies(roomTypeId, checkIn) void
        +applyStrategies(baseRate, context) Object
        +computePrice(roomTypeId, checkIn, checkOut) PricingResult
    }

    PricingStrategy <|-- SeasonalPricing : extends
    PricingStrategy <|-- DemandPricing : extends
    PricingStrategy <|-- OccupancyPricing : extends
    PricingStrategy <|-- LengthOfStayDiscount : extends
    PricingStrategy <|-- EarlyBirdPricing : extends
    PricingStrategy <|-- LastMinutePricing : extends

    PricingStrategyFactory ..> PricingStrategy : creates
    YieldPricingEngine --> PricingStrategyFactory : uses
    YieldPricingEngine o-- PricingStrategy : composes

    User "1" --> "0..*" Booking : places
    Hotel "1" *-- "1..*" RoomType : has
    Hotel "1" *-- "0..*" Room : owns
    RoomType "1" *-- "0..*" Room : categorizes
    RoomType "1" *-- "0..*" InventoryCalendar : tracks
    RoomType "1" *-- "0..*" PricingRule : governed_by
    Booking "1" --> "1" Payment : paid_via
    Booking "1" *-- "1..*" BookingItem : contains
```
