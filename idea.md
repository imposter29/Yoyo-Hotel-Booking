# Hotel Room Booking & Yield Pricing System — Idea

## Problem Statement

Hotels relying on static pricing models lose revenue during peak demand and occupancy during off-peak periods. There is no native mechanism in most systems for real-time inventory tracking, dynamic rate computation, or automated booking lifecycle management. This project solves these gaps with a backend-intensive, OOP-driven system.

---

## System Overview

A full-stack web application with a backend-first design:
- **Guests/Customers** search, reserve, and manage hotel room bookings
- **Admins** manage rooms, pricing rules, seasons, and inventory
- **Yield Pricing Engine** computes optimal rates using composable strategies
- **Background Schedulers** automate hold expiry, pricing recalculation, and reminders
- **Notification System** dispatches confirmations, reminders, and cancellation alerts

---

## Goals & Scope

### Goals
| # | Goal |
|---|------|
| G1 | Real-time room availability with per-day inventory tracking |
| G2 | Dynamic yield pricing via composable strategy patterns |
| G3 | Booking lifecycle state machine (HOLD → CONFIRMED → CHECKED_OUT) |
| G4 | Rule-based pricing configuration for admins |
| G5 | Automated background jobs (hold expiry, nightly pricing) |
| G6 | Demonstrate OOP principles and design patterns in production-grade backend |

### In Scope
User auth, hotel/room management, availability search, yield pricing, booking CRUD, payment abstraction, invoice generation, add-on services, background schedulers, notifications.

### Out of Scope (Milestone 1)
OTA channel sync, mobile apps, ML demand forecasting, multi-chain management.

---

## Backend Architecture

```
HTTP Layer        →  Express Routes + Middleware + Request Validators
Controller Layer  →  Parse & validate request → delegate to service → return HTTP response
Service Layer     →  Business logic, state machine, orchestration, transactions
Repository Layer  →  Data access abstraction via Knex.js (no ORM)
Database Layer    →  PostgreSQL (relational integrity, row-level locking)
```

---

## Key Features

### Search Availability
- Per-room, per-day inventory via `inventory_calendar` table
- Date-range availability queries with SQL window functions
- Optimistic locking (`FOR UPDATE`) to prevent race conditions

### Dynamic Yield Pricing
- Base rate × composable multipliers (seasonal, demand, occupancy, length-of-stay)
- Strategies loaded from `pricing_rules` table and applied in priority order
- Price computed fresh at booking time; stored in `booking_items` for audit trail

### Booking & Reservation
- Temporary hold (15-min TTL) created before payment
- Atomic inventory decrement + booking insert in single DB transaction
- Hold expiry job releases inventory every 5 minutes

### Payment Workflow
- Payment abstraction layer (Stripe/Razorpay-ready)
- Payment record linked to booking; triggers state transition to CONFIRMED
- Webhook support for async payment status updates

### Cancellation & Refund
- `CancellationPolicy` computes refund based on hours until check-in
- Tiered refund structure (free window → partial → no refund)
- Inventory restored on cancellation

### Inventory Management
- `inventory_calendar`: one row per room-type per date
- Admin can view and adjust daily availability
- Nightly job recalculates demand index for next 30 days

### Seasonal Pricing Rules
- Admins define seasons (peak/off-peak) with date ranges and multipliers
- Rules linked to room types with priority ordering
- `PricingStrategyFactory` instantiates correct strategy per rule type

### Pricing Strategies
```
finalPrice = baseRate
           × seasonMultiplier      // e.g. 1.4 during Christmas
           × demandMultiplier      // e.g. 1.2 if booking velocity is high
           × occupancyMultiplier   // e.g. 1.3 if >80% rooms occupied
           × lengthOfStayDiscount  // e.g. 0.9 for stays > 7 nights
```

---

## OOP Principles

| Principle | Application |
|-----------|-------------|
| **Encapsulation** | `Booking.transitionTo()` — state changes only via controlled method |
| **Abstraction** | `PricingStrategy` interface — engine works against interface, not concrete classes |
| **Inheritance** | `SeasonalPricing`, `DemandPricing` implement `PricingStrategy` |
| **Polymorphism** | `engine.apply(strategy)` — each strategy computes differently via same interface |

---

## Design Patterns

| Pattern | Where Used | Justification |
|---------|-----------|---------------|
| **Strategy** | Yield Pricing Engine | Multiple interchangeable pricing algorithms |
| **State** | Booking Lifecycle | Enforces valid state transitions; prevents illegal state changes |
| **Factory** | PricingStrategyFactory | Creates strategy instances from DB-loaded rule config |
| **Observer** | Notification System | Decouples booking events from notification dispatch via EventEmitter |

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
| Performance | Availability API < 200ms for 30-day range query |
| Concurrency | Handle 100 concurrent bookings without double-booking |
| Security | JWT on all endpoints; parameterized SQL queries |
| Auditability | All state transitions logged with timestamp and actor |
| Testability | > 80% unit test coverage on service layer |
| Scalability | Stateless API; horizontally scalable behind load balancer |

---

## Future Enhancements

- ML-based demand forecasting to replace rule-based demand index
- OTA channel manager integration (Booking.com, Expedia)
- Multi-currency support with live exchange rates
- Loyalty points program
- Revenue analytics dashboard (RevPAR, ADR, occupancy trends)
- Waitlist system for sold-out dates
- GraphQL API layer
- Microservices extraction (Pricing Engine, Notification Service)
