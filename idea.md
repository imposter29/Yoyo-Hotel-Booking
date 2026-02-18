# Hotel Room Booking & Yield Pricing System — Idea

## Problem Statement

Hotels using static flat-rate pricing lose revenue during high-demand periods and occupancy during low-demand periods. Most existing systems lack native dynamic pricing, real-time inventory management, and automated booking lifecycle management.

---

## System Overview

A backend-heavy full-stack web application that enables:
- Guests to search, hold, book, and manage hotel rooms
- Admins to manage rooms, pricing rules, and inventory
- A Yield Pricing Engine to compute optimal rates dynamically
- Background schedulers to automate holds, pricing, and reminders

---

## Goals

| # | Goal |
|---|------|
| G1 | Real-time room availability with per-day inventory tracking |
| G2 | Dynamic yield pricing using composable strategy patterns |
| G3 | Booking lifecycle state machine (HOLD → CONFIRMED → CHECKED_OUT) |
| G4 | Rule-based pricing configuration for admins |
| G5 | Background schedulers for automation |
| G6 | Demonstrate OOP principles and design patterns |

---

## Scope

**In Scope:** User auth, hotel/room management, availability check, yield pricing, booking CRUD, payment abstraction, invoice generation, add-on services, background jobs, notifications.

**Out of Scope (Milestone 1):** OTA channel sync, mobile apps, ML demand forecasting, multi-chain management.

---

## Key Backend Features

- **Availability Engine** — Per-room per-day inventory via `room_inventory_daily`; optimistic locking prevents double-booking
- **Yield Pricing Engine** — Composable strategies (Seasonal, Demand, Occupancy); price computed fresh at booking time
- **Booking State Machine** — States: `HOLD → PENDING_PAYMENT → CONFIRMED → CHECKED_IN → CHECKED_OUT → CANCELLED → REFUNDED`
- **Cancellation Policy Engine** — Refund tiers computed by `CancellationPolicy` at cancellation time
- **Background Schedulers** — Hold expiry (every 5 min), nightly pricing recalculation, check-in reminders
- **Add-On Services** — Breakfast, parking, spa attached to bookings; Decorator pattern for cost composition

---

## Dynamic Yield Pricing

```
finalPrice = baseRate
           × seasonMultiplier      // e.g. 1.4 during Christmas
           × demandMultiplier      // e.g. 1.2 if booking velocity is high
           × occupancyMultiplier   // e.g. 1.3 if >80% rooms occupied
           × lengthOfStayDiscount  // e.g. 0.9 for stays > 7 nights
```

| Strategy | Trigger | Effect |
|----------|---------|--------|
| SeasonalStrategy | Date in defined season | Applies season multiplier |
| DemandStrategy | Booking velocity index | Increases price on high demand |
| OccupancyStrategy | Occupancy % for dates | Surcharges above threshold |
| LengthOfStayStrategy | Number of nights | Discounts for extended stays |

---

## Backend Architecture

```
HTTP Layer        →  Routes + Middleware + Validators
Controller Layer  →  Parse request, validate, call service, return response
Service Layer     →  Business logic, state machine, orchestration
Repository Layer  →  Data access abstraction (Knex.js queries)
Database Layer    →  PostgreSQL
```

---

## OOP Principles

| Principle | Application |
|-----------|-------------|
| Encapsulation | `Booking.transitionTo()` — state changes only via method |
| Abstraction | `PricingStrategy` interface — engine works against interface |
| Inheritance | `SeasonalStrategy`, `DemandStrategy`, `OccupancyStrategy` implement `PricingStrategy` |
| Polymorphism | `engine.apply(strategy)` — each strategy computes differently |
| SRP | Each service has one responsibility |
| Open/Closed | New strategies added without modifying `YieldPricingEngine` |

---

## Design Patterns

| Pattern | Where Used | Justification |
|---------|-----------|---------------|
| **Strategy** | Yield Pricing Engine | Multiple interchangeable pricing algorithms |
| **State** | Booking Lifecycle | Enforces valid state transitions |
| **Factory** | PricingStrategyFactory | Creates strategies from DB-loaded rules |
| **Decorator** | Add-On Services | Composes add-on costs onto base booking |
| **Repository** | Data Access | Decouples business logic from DB queries |
| **Observer** | Notifications | Decouples booking events from notification dispatch |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 LTS |
| Framework | Express.js |
| Database | PostgreSQL 15 |
| Query Builder | Knex.js |
| Auth | JWT |
| Validation | Joi |
| Scheduler | node-cron |
| Testing | Jest + Supertest |
| Frontend | React 18 + Vite |

---

## Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Availability API < 200ms for 30-day range |
| Concurrency | 100 concurrent bookings without double-booking |
| Security | JWT on all endpoints; parameterized queries |
| Auditability | All state transitions logged with timestamp |
| Testability | > 80% unit test coverage on service layer |

---

## Future Enhancements

- ML-based demand forecasting
- OTA channel manager integration
- Multi-currency support
- Loyalty points program
- Revenue analytics dashboard
- Waitlist system for sold-out dates
- GraphQL API layer
- Microservices extraction (Pricing Engine, Notifications)
