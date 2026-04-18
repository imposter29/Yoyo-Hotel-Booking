# Yoyo Hotel Booking 

A full-stack hotel booking platform built with the MERN stack. Features a **Yield Pricing Engine** with OOP strategy patterns, real-time inventory tracking, a booking state machine, and a three-tier role system.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (stateless) |
| Validation | Joi |
| Scheduler | node-cron |
| Styling | Vanilla CSS |

---

## Roles

| Role | Capabilities |
|------|-------------|
| `guest` | Search hotels, book rooms, view/cancel bookings, write reviews |
| `hotel_admin` | List hotels (pending approval), manage room types, configure pricing rules |
| `superadmin` | Approve/reject hotels, manage all users and roles |

---

## Features

- **Search & Discovery** — Search by city/hotel name, filter by stars and rating, browse by city pills
- **Dynamic Yield Pricing** — Prices computed at booking time using a composable strategy chain (seasonal, demand, occupancy, length-of-stay, early bird, last-minute)
- **Booking State Machine** — `hold → confirmed → cancelled/expired` with 15-min hold TTL
- **Custom Date Picker** — React-based calendar component (cross-browser, no native input issues)
- **Real-time Prices on Cards** — Hotel listing shows the cheapest room type's actual price
- **Background Jobs** — Cron job every 5 minutes releases expired holds and restores inventory
- **Notifications** — Async booking confirmation and cancellation emails via EventEmitter (Observer pattern)
- **Admin Dashboard** — Full superadmin panel to manage hotels, users, bookings

---

## OOP Design Patterns

| Pattern | File | Description |
|---------|------|-------------|
| **Strategy** | `services/pricing/PricingStrategy.js` | Abstract base class + 6 concrete strategies (Seasonal, Demand, Occupancy, LengthOfStay, EarlyBird, LastMinute) |
| **Factory** | `services/pricing/PricingStrategyFactory.js` | Maps DB `ruleType` strings → concrete strategy class instances |
| **Composition** | `services/pricing/YieldPricingEngine.js` | Composes and applies strategies; `finalPrice = baseRate × ∏(multipliers)` |
| **State Machine** | `models/Booking.js` | `Booking.transitionTo()` enforces valid state transitions |
| **Observer** | `services/notification/notificationService.js` | Node.js EventEmitter decouples booking events from email dispatch |

---

## Project Structure

```
Yoyo-Hotel-Booking/
 backend/
    config/
       db.js                         # MongoDB connection
    controllers/
       authController.js             # Register, Login, GetMe
       hotelController.js            # Hotel CRUD + search + startingFrom price
       bookingController.js          # Availability check, Hold, Cancel
       paymentController.js          # Payment recording
       reviewController.js           # Hotel reviews
       roomTypeController.js         # Room type management
       adminController.js            # Superadmin actions
    jobs/
       holdExpiryJob.js              # Cron: expire holds every 5 min
    middleware/
       auth.js                       # JWT protect + authorize(roles)
       errorHandler.js              # Global error handler
       validators/                   # Joi schema validators
    models/
       User.js                       # guest | hotel_admin | superadmin
       Hotel.js                      # Hotel with geo + amenities + approval
       RoomType.js                   # Room category + base rate + cancellation policy
       Room.js                       # Physical room entity
       Booking.js                    # State machine: hold→confirmed→cancelled
       InventoryCalendar.js          # Per-day availability + demand index
       PricingRule.js                # DB-driven pricing rule config
       Payment.js                    # Payment record
       Review.js                     # Hotel reviews
       Deal.js                       # Hotel deals/promotions
    routes/                           # Express route definitions
    services/
       booking/
          AvailabilityService.js    # Atomic room reservation
       pricing/
          PricingStrategy.js        # Abstract base + 6 concrete strategies
          PricingStrategyFactory.js # Factory: ruleType → strategy class
          YieldPricingEngine.js     # Engine: loads, composes, applies strategies
       notification/
           notificationService.js    # EventEmitter-based email notifications
    utils/
       AppError.js                   # Operational error class
       asyncHandler.js              # Async try/catch wrapper
    seeds/                            # Database seed scripts
    server.js                         # Express entry point
    .env.example

 frontend/
     src/
         components/
            common/                   # Navbar, Footer, Layout
         context/
            AuthContext.jsx           # JWT auth state + rehydration
         pages/
            HomePage.jsx              # Hero search + custom MiniCalendar
            HotelsPage.jsx            # Listings with real prices + filters
            HotelDetailPage.jsx       # Gallery, room types, reviews
            BookingPage.jsx           # Booking form with custom date picker
            BookingConfirmationPage.jsx
            PaymentPage.jsx
            MyBookingsPage.jsx
            LoginPage.jsx
            RegisterPage.jsx
            ProfilePage.jsx
            ListHotelPage.jsx         # Hotel admin: list a hotel
            AdminDashboardPage.jsx    # Superadmin dashboard
         services/
            api.js                    # Axios instance + interceptors
         App.jsx                       # Router + protected routes
```

---

## API Reference

Base URL: `http://localhost:3000/api/`

### Auth — `/api/auth`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register a new user |
| POST | `/login` | Public | Login and receive JWT |
| POST | `/logout` | Public | Logout |
| GET | `/me` | Protected | Get current user profile |
| PATCH | `/profile` | Protected | Update name, phone, avatar |
| PATCH | `/change-password` | Protected | Change password |

### Hotels — `/api/hotels`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | Search/filter hotels (includes `startingFrom` price) |
| GET | `/:id` | Public | Get hotel detail with room types |
| PATCH | `/:id` | hotel_admin | Update hotel info |
| POST | `/submit` | hotel_admin | Submit hotel for superadmin approval |
| DELETE | `/:id` | superadmin | Soft-delete (deactivate) a hotel |

### Room Types — `/api/room-types`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | List room types (filter by `hotelId`) |
| GET | `/:id` | Public | Get single room type |
| POST | `/` | hotel_admin | Create a room type |
| PATCH | `/:id` | hotel_admin | Update a room type |
| DELETE | `/:id` | hotel_admin | Delete a room type |
| GET | `/:id/rooms` | hotel_admin | List physical rooms of this type |
| POST | `/:id/rooms` | hotel_admin | Add a physical room to this type |

### Bookings — `/api/bookings`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/check` | Public | Check availability + get yield price quote |
| POST | `/` | guest | Create booking in HOLD state (15-min TTL) |
| GET | `/my` | Protected | List current user's bookings |
| GET | `/:id` | Protected | Get single booking |
| PATCH | `/:id/cancel` | Protected | Cancel a booking |

### Payments — `/api/payments`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/initiate` | Protected | Initiate a payment for a booking |
| POST | `/:paymentId/confirm` | Protected | Confirm payment → transitions booking to confirmed |
| GET | `/booking/:bookingId` | Protected | Get payment record for a booking |

### Reviews — `/api/hotels/:hotelId/reviews`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | Get reviews for a hotel |
| POST | `/` | guest | Submit a review |
| DELETE | `/:reviewId` | Protected | Delete a review (owner or superadmin) |

### Cities — `/api/cities`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | List cities (with hotel count) |
| GET | `/stats` | Public | City stats for the homepage |

### Deals — `/api/deals`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Public | List all active deals |
| GET | `/:id` | Public | Get single deal |
| POST | `/` | superadmin | Create a deal |
| PATCH | `/:id` | superadmin | Update a deal |
| DELETE | `/:id` | superadmin | Delete a deal |

### Newsletter — `/api/newsletter`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/subscribe` | Public | Subscribe to newsletter |
| POST | `/unsubscribe` | Public | Unsubscribe |
| GET | `/subscribers` | superadmin | List all subscribers |

### Admin — `/api/admin`
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/analytics` | superadmin | Platform-wide analytics |
| GET | `/users` | superadmin | List all users |
| GET | `/users/:id` | superadmin | Get user by ID |
| PATCH | `/users/:id` | superadmin | Update user (role, status) |
| GET | `/hotels` | superadmin | List all hotels |
| GET | `/hotels/pending` | superadmin | List pending approval hotels |
| POST | `/hotels` | superadmin | Create hotel directly |
| PATCH | `/hotels/:hotelId/approve` | superadmin | Approve a hotel listing |
| PATCH | `/hotels/:hotelId/reject` | superadmin | Reject a hotel listing |
| PATCH | `/hotels/:hotelId/rooms` | superadmin | Update room inventory |
| GET | `/bookings` | superadmin | List all bookings |
| PATCH | `/bookings/:id/status` | superadmin | Update any booking status |
| GET | `/reviews` | superadmin | List all reviews |

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set MONGO_URI and JWT_SECRET
npm install
npm run dev
# Runs on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Environment Variables

**`backend/.env`**
```
MONGO_URI=mongodb://localhost:27017/yoyo-hotel
JWT_SECRET=your_jwt_secret_here
PORT=5000
NODE_ENV=development
```

**`frontend/.env`**
```
VITE_API_URL=http://localhost:5000/api
```

---

## Design Documents

| File | Description |
|------|-------------|
| `idea.md` | Full project concept, OOP principles, design patterns |
| `classDiagram.md` | UML class diagram — all models and service classes |
| `ErDiagram.md` | Entity-relationship diagram — all MongoDB collections |
| `sequenceDiagram.md` | Booking flow sequence — controller → engine → strategies → DB |
| `useCaseDiagram.md` | Use cases per actor (Guest, HotelAdmin, SuperAdmin, Scheduler) |
