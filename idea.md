# Hotel Room Booking & Yield Pricing System — Idea

## Problem Statement

Hotels relying on static pricing models lose revenue during peak demand and occupancy during off-peak periods. There is no native mechanism in most systems for real-time inventory tracking, dynamic rate computation, or automated booking lifecycle management. This project solves these gaps with a backend-intensive, OOP-driven system.

---

## System Overview

A full-stack web application with a backend-first design:
- **Guests/Customers** search, reserve, and manage hotel room bookings
- **Hotel Admins** list and manage hotels, room types, and pricing rules
- **Super Admins** approve hotel listings and manage all users
- **Yield Pricing Engine** computes optimal rates using composable OOP strategies
- **Background Schedulers** automate hold expiry via node-cron
- **Notification System** dispatches confirmations and cancellation alerts via Observer pattern

---

## Goals & Scope

### Goals
| # | Goal |
|---|------|
| G1 | Real-time room availability with per-day inventory tracking |
| G2 | Dynamic yield pricing via composable Strategy design pattern |
| G3 | Booking lifecycle state machine (hold → confirmed → cancelled) |
| G4 | Rule-based pricing configuration for hotel admins |
| G5 | Automated background jobs (hold expiry every 5 min) |
| G6 | Demonstrate OOP principles and design patterns in production-grade backend |
| G7 | Role-based access control (guest / hotel_admin / superadmin) |

### In Scope
User auth (JWT + RBAC), hotel/room management, availability search, yield pricing engine, booking CRUD, payment recording, background schedulers, notifications, admin approval workflow.

### Out of Scope (Milestone 1)
OTA channel sync, mobile apps, ML demand forecasting, invoice PDF generation, Stripe/Razorpay live integration.

---

## Backend Architecture

```
HTTP Layer        →  Express Routes + Joi Validators + Auth Middleware
Controller Layer  →  Parse & validate request → delegate to service → return HTTP response
Service Layer     →  YieldPricingEngine, AvailabilityService, NotificationService
Model Layer       →  Mongoose schemas (MongoDB) — User, Hotel, RoomType, Room,
                      Booking, Payment, PricingRule, InventoryCalendar, Review
```

---

## Key Features

### Search Availability
- Per-room, per-day inventory via `InventoryCalendar` collection
- Date-range availability queries
- Hold expiry releases inventory every 5 minutes via cron job

### Dynamic Yield Pricing (OOP Strategy Pattern)
```
finalPrice = baseRate
           × seasonMultiplier      // e.g. ×1.4 during Christmas (SeasonalPricing)
           × demandMultiplier      // e.g. ×1.2 if demandIndex high (DemandPricing)
           × occupancyMultiplier   // e.g. ×1.3 if >80% rooms occupied (OccupancyPricing)
           × lengthOfStayDiscount  // e.g. ×0.9 for stays ≥7 nights (LengthOfStayDiscount)
           × earlyBirdDiscount     // e.g. ×0.85 if booked 30+ days ahead (EarlyBirdPricing)
           × lastMinuteDiscount    // e.g. ×0.8 if booked within 3 days (LastMinutePricing)
```

### Booking & Reservation
- Temporary hold (15-min TTL) created before payment
- Inventory decremented atomically on hold creation
- Hold expiry job releases inventory every 5 minutes

### Payment Workflow
- Payment record linked to booking; triggers state transition to confirmed
- Payment abstraction layer (Stripe/Razorpay-ready)

### Cancellation
- Booking.transitionTo() enforces valid state transitions (State pattern)
- Inventory restored on cancellation

---

## OOP Principles Implemented

| Principle | Application |
|-----------|-------------|
| **Abstraction** | `PricingStrategy` abstract base class — `YieldPricingEngine` works against the interface, never concrete classes |
| **Inheritance** | `SeasonalPricing`, `DemandPricing`, `OccupancyPricing`, `LengthOfStayDiscount`, `EarlyBirdPricing`, `LastMinutePricing` all extend `PricingStrategy` |
| **Polymorphism** | `strategy.apply(context)` is called on all 6 concrete types; each computes the multiplier differently |
| **Encapsulation** | `Booking.transitionTo()` — state changes only via this controlled method; conditions are private inside each strategy class |

---

## Design Patterns Implemented

| Pattern | File | Description |
|---------|------|-------------|
| **Strategy** | `PricingStrategy.js` | 6 interchangeable pricing strategies with a common `apply()` interface |
| **Factory** | `PricingStrategyFactory.js` | Creates the right strategy class from a DB `PricingRule` document |
| **State** | `Booking.js` (`transitionTo()`) | Enforces valid booking state transitions: hold → confirmed → cancelled |
| **Observer** | `notificationService.js` | Node.js EventEmitter decouples booking events from email dispatch |
| **Composition** | `YieldPricingEngine.js` | Engine composes an array of strategy objects, applying them in priority order |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 LTS |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken) |
| Validation | Joi |
| Scheduler | node-cron |
| Frontend | React 18 + Vite |

---

## Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Availability API <200ms for date range queries |
| Concurrency | Hold expiry prevents double-booking |
| Security | JWT on all protected endpoints; Joi schema validation |
| Auditability | All booking state transitions logged with timestamps |
| Scalability | Stateless JWT API; horizontally scalable |

---

## Future Enhancements

- Invoice PDF generation with tax breakdown
- Stripe/Razorpay live payment gateway integration
- ML-based demand forecasting to replace rule-based demand index
- OTA channel manager integration (Booking.com, Expedia)
- Multi-currency support
- Loyalty points program
- Revenue analytics dashboard (RevPAR, ADR, occupancy trends)
- Unit test coverage >80% on service layer (Jest + Supertest)
- GraphQL API layer
