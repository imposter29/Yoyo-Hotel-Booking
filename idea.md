# 📄 idea.md — Hotel Room Booking & Yield Pricing System

---

## 1. Problem Statement

Traditional hotel booking systems suffer from static, flat-rate pricing models that fail to adapt to real-world demand fluctuations. Hotels lose significant revenue during high-demand periods by underpricing, and lose occupancy during low-demand periods by overpricing. Existing solutions either rely on expensive third-party revenue management software or lack the backend sophistication to implement dynamic pricing natively.

Additionally, most systems lack:
- Real-time inventory management per room per day
- Automated hold expiration and room release mechanisms
- Flexible, rule-based pricing engines that can combine multiple pricing strategies
- Proper state machine management for booking lifecycle

This project addresses these gaps by building a **backend-heavy, OOP-driven Hotel Room Booking & Yield Pricing System** that implements dynamic yield pricing as a first-class feature.

---

## 2. System Overview

The **Hotel Room Booking & Yield Pricing System** is a full-stack web application with a backend-first design philosophy. The system enables:

- **Guests** to search, compare, and book hotel rooms with real-time dynamic pricing
- **Hotel Admins** to manage room inventory, pricing rules, seasons, and cancellation policies
- **A Yield Pricing Engine** to compute optimal room rates based on occupancy, demand, and seasonal factors
- **Background Schedulers** to release expired holds, trigger pricing recalculations, and send reminders
- **A Payment Gateway Integration** to handle secure transactions, refunds, and invoice generation

The system is designed as a **RESTful API backend** (Node.js + Express) with a **React frontend** consuming the APIs. The database layer uses **PostgreSQL** for relational integrity and complex query support.

---

## 3. Goals

| # | Goal |
|---|------|
| G1 | Implement a fully functional hotel room booking system with real-time availability |
| G2 | Build a dynamic yield pricing engine using composable strategy patterns |
| G3 | Enforce booking lifecycle state transitions (PENDING → CONFIRMED → CANCELLED, etc.) |
| G4 | Provide a rule-based pricing configuration system for hotel admins |
| G5 | Automate inventory management via background schedulers |
| G6 | Demonstrate OOP principles and design patterns in a real-world backend context |
| G7 | Deliver a normalized, production-grade relational database schema |

---

## 4. Scope

### In Scope
- User registration, authentication (JWT), and role-based access control (Guest, Admin)
- Hotel and room management (CRUD for admins)
- Room type and inventory calendar management
- Search and availability checking with date-range queries
- Dynamic yield pricing computation at booking time
- Booking creation, modification, and cancellation with policy enforcement
- Payment processing (integration-ready abstraction layer)
- Invoice and receipt generation
- Add-on services (breakfast, airport transfer, spa, etc.)
- Background job: release expired holds (15-minute hold timeout)
- Background job: nightly pricing recalculation
- Notification system (email stubs/events)

### Out of Scope (Milestone 1)
- Multi-property chain management
- Channel manager integration (OTA sync)
- Mobile applications
- Real-time chat/concierge
- Advanced ML-based demand forecasting

---

## 5. Key Backend Features

### 5.1 Room Availability Engine
- Per-room, per-day inventory tracking via `room_inventory_daily` table
- Availability check queries across date ranges using SQL window functions
- Optimistic locking to prevent double-booking race conditions
- Temporary hold mechanism (15-minute TTL) before payment confirmation

### 5.2 Dynamic Yield Pricing Engine
- Composable pricing strategies applied in sequence
- Base rate from `room_types` table
- Multipliers applied from: seasonal rules, demand index, occupancy threshold
- Final price = `baseRate × seasonMultiplier × demandMultiplier × occupancyMultiplier`
- Price computed fresh at booking time; stored in `booking_items` for audit trail

### 5.3 Booking Lifecycle State Machine
- States: `HOLD → PENDING_PAYMENT → CONFIRMED → CHECKED_IN → CHECKED_OUT → CANCELLED → REFUNDED`
- State transitions enforced at service layer
- Invalid transitions throw domain exceptions

### 5.4 Cancellation Policy Engine
- Policies defined per room type: free cancellation window, partial refund tiers, no-refund zone
- Refund amount computed by `CancellationPolicy` domain class at cancellation time

### 5.5 Background Schedulers
- **Hold Expiry Job**: Runs every 5 minutes; releases holds older than 15 minutes, restores inventory
- **Nightly Pricing Job**: Recalculates demand index based on booking velocity for next 30 days
- **Reminder Job**: Sends check-in reminders 24 hours before arrival

### 5.6 Add-On Services
- Guests can attach add-ons to bookings (breakfast, parking, spa)
- Add-ons priced independently; included in invoice total
- Decorator pattern used to compose add-on pricing onto base booking cost

---

## 6. Dynamic Yield Pricing — Detailed Explanation

Yield pricing (also called revenue management) is the practice of adjusting room rates dynamically based on supply and demand signals to maximize revenue per available room (RevPAR).

### Pricing Formula
```
finalPrice = baseRate
           × seasonMultiplier      // e.g., 1.4 during Christmas
           × demandMultiplier      // e.g., 1.2 if booking velocity is high
           × occupancyMultiplier   // e.g., 1.3 if >80% rooms occupied
           × lengthOfStayDiscount  // e.g., 0.9 for stays > 7 nights
```

### Strategy Components

| Strategy | Trigger | Effect |
|----------|---------|--------|
| **SeasonalStrategy** | Date falls within a defined season | Applies season multiplier (peak/off-peak) |
| **DemandStrategy** | Booking velocity index for target dates | Increases price when demand is trending up |
| **OccupancyStrategy** | Current occupancy % for target dates | Surcharges when occupancy > threshold |
| **LengthOfStayStrategy** | Number of nights booked | Discounts for extended stays |

### Pricing Rule Engine
- Admins define `pricing_rules` with: `rule_type`, `multiplier`, `priority`, `effective_from`, `effective_to`
- Rules are loaded and sorted by priority at engine startup
- `YieldPricingEngine` applies all applicable rules in order
- Strategies are injected via constructor (Strategy + Dependency Injection pattern)

---

## 7. Backend Architecture Style

### Layered Architecture (Controller → Service → Repository)

```
┌─────────────────────────────────────────────────────┐
│                   HTTP Layer (Express)               │
│              Routes + Middleware + Validators        │
├─────────────────────────────────────────────────────┤
│                  Controller Layer                    │
│   BookingController, RoomController, PricingCtrl    │
│   - Parse request, validate input, call service     │
│   - Return HTTP response                            │
├─────────────────────────────────────────────────────┤
│                   Service Layer                      │
│   BookingService, AvailabilityService,              │
│   YieldPricingEngine, PaymentService,               │
│   CancellationService, NotificationService          │
│   - Business logic, domain rules, orchestration     │
│   - State machine enforcement                       │
├─────────────────────────────────────────────────────┤
│                 Repository Layer                     │
│   BookingRepository, RoomRepository,                │
│   InventoryRepository, PricingRuleRepository        │
│   - Data access abstraction                         │
│   - SQL queries via query builder (Knex.js)         │
├─────────────────────────────────────────────────────┤
│                  Database Layer                      │
│              PostgreSQL (via Knex.js)               │
└─────────────────────────────────────────────────────┘
```

### Key Architectural Decisions
- **No ORM** (Sequelize/TypeORM avoided): Raw SQL via Knex.js for performance and control
- **Repository pattern**: Decouples business logic from data access; enables easy testing with mocks
- **Service layer owns transactions**: `BookingService.createBooking()` wraps inventory deduction + booking insert in a single DB transaction
- **Dependency Injection**: Services receive repositories and strategies via constructor injection
- **Event-driven notifications**: `EventEmitter` used internally to decouple notification triggers from booking logic

---

## 8. OOP Principles Applied

| Principle | Application |
|-----------|-------------|
| **Encapsulation** | `Booking` class encapsulates state transitions; external code cannot set state directly — must call `transitionTo(newState)` |
| **Abstraction** | `PricingStrategy` interface abstracts pricing computation; `YieldPricingEngine` works against the interface, not concrete strategies |
| **Inheritance** | `SeasonalStrategy`, `DemandStrategy`, `OccupancyStrategy` all extend/implement `PricingStrategy` |
| **Polymorphism** | `YieldPricingEngine` calls `strategy.apply(context)` on each strategy; each computes differently but through the same interface |
| **Single Responsibility** | Each service class has one responsibility: `AvailabilityService` only checks availability; `PaymentService` only handles payments |
| **Open/Closed** | New pricing strategies can be added without modifying `YieldPricingEngine` — open for extension, closed for modification |

---

## 9. Design Patterns Used

### 9.1 Strategy Pattern — Yield Pricing
**Justification**: Multiple interchangeable pricing algorithms need to be applied dynamically based on configuration. The Strategy pattern allows each algorithm to be encapsulated independently and composed at runtime.

```
PricingStrategy (interface)
  ├── SeasonalStrategy
  ├── DemandStrategy
  ├── OccupancyStrategy
  └── LengthOfStayStrategy
```

`YieldPricingEngine` holds a list of `PricingStrategy` instances and applies them in sequence.

### 9.2 State Pattern — Booking Lifecycle
**Justification**: A `Booking` object transitions through well-defined states with specific rules about which transitions are valid. The State pattern externalizes transition logic, preventing invalid state changes and keeping the `Booking` class clean.

```
BookingState (interface)
  ├── HoldState
  ├── PendingPaymentState
  ├── ConfirmedState
  ├── CheckedInState
  ├── CheckedOutState
  ├── CancelledState
  └── RefundedState
```

### 9.3 Factory Pattern — Strategy Instantiation
**Justification**: `PricingStrategyFactory` creates the correct strategy instances based on `pricing_rules` loaded from the database. This decouples strategy creation from the engine and supports runtime configuration.

```javascript
class PricingStrategyFactory {
  static create(rule) {
    switch (rule.type) {
      case 'SEASONAL':   return new SeasonalStrategy(rule);
      case 'DEMAND':     return new DemandStrategy(rule);
      case 'OCCUPANCY':  return new OccupancyStrategy(rule);
    }
  }
}
```

### 9.4 Decorator Pattern — Add-On Services
**Justification**: Add-on services (breakfast, parking, spa) augment the base booking cost. The Decorator pattern allows add-ons to be composed onto the base `BookingCostCalculator` without modifying it.

```
BookingCostComponent (interface)
  ├── BaseBookingCost (concrete component)
  ├── BreakfastDecorator
  ├── ParkingDecorator
  └── SpaDecorator
```

### 9.5 Repository Pattern — Data Access
**Justification**: Abstracts all database queries behind repository interfaces. Services depend on repository interfaces, not concrete implementations — enabling unit testing with mock repositories.

### 9.6 Observer/Event Pattern — Notifications
**Justification**: Booking events (confirmed, cancelled, check-in reminder) should trigger notifications without coupling the booking service to the notification service. Node.js `EventEmitter` implements this cleanly.

---

## 10. Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Runtime** | Node.js 20 LTS | Non-blocking I/O ideal for concurrent booking requests |
| **Framework** | Express.js | Lightweight, unopinionated; full control over middleware stack |
| **Database** | PostgreSQL 15 | ACID transactions, complex joins, window functions for inventory queries |
| **Query Builder** | Knex.js | SQL control without ORM overhead; supports migrations and transactions |
| **Authentication** | JWT (jsonwebtoken) | Stateless auth; scalable for API consumers |
| **Validation** | Joi / Zod | Schema-based request validation at controller layer |
| **Scheduling** | node-cron | Lightweight cron-based scheduler for background jobs |
| **Password Hashing** | bcrypt | Industry standard for password storage |
| **Logging** | Winston | Structured logging with log levels and transports |
| **Testing** | Jest + Supertest | Unit tests for services; integration tests for API endpoints |
| **Frontend** | React 18 + Vite | SPA consuming REST APIs; not the focus of Milestone 1 |
| **API Docs** | Swagger/OpenAPI | Auto-generated API documentation |

---

## 11. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Availability check API must respond in < 200ms for a 30-day range query |
| **Concurrency** | System must handle 100 concurrent booking requests without double-booking |
| **Scalability** | Stateless API design allows horizontal scaling behind a load balancer |
| **Reliability** | Hold expiry job must run with < 1 minute tolerance; missed holds auto-expire on next booking attempt |
| **Security** | All endpoints require JWT; admin endpoints require role check; SQL injection prevented via parameterized queries |
| **Auditability** | All booking state transitions logged with timestamp and actor |
| **Testability** | Service layer must achieve > 80% unit test coverage; repository layer mockable |
| **Maintainability** | Layered architecture enforced; no direct DB calls from controllers |
| **Data Integrity** | Database-level constraints (FK, UNIQUE, CHECK) enforce business rules at storage layer |

---

## 12. Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| **ML Demand Forecasting** | Replace rule-based demand index with ML model trained on historical booking data |
| **Channel Manager Integration** | Sync inventory and rates with OTAs (Booking.com, Expedia) via XML/REST |
| **Multi-Currency Support** | Store prices in base currency; convert at display time using exchange rate service |
| **Loyalty Program** | Points accumulation and redemption integrated into booking flow |
| **Rate Parity Engine** | Ensure rates across channels comply with parity agreements |
| **Revenue Dashboard** | Admin analytics: RevPAR, ADR, occupancy trends, pricing effectiveness |
| **Group Bookings** | Block booking for events with negotiated rates |
| **Waitlist System** | Queue guests for sold-out dates; auto-notify on cancellation |
| **GraphQL API** | Expose flexible query API for frontend and third-party consumers |
| **Microservices Migration** | Extract Pricing Engine and Notification Service as independent microservices |
