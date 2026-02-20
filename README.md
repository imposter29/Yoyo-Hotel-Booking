# Yoyo Hotel Booking 🏨

A full-stack MERN hotel booking platform with a **Yield Pricing Engine**, real-time inventory management, and a booking state machine.

---

## Project Structure

```
Yoyo-Hotel-Booking/
├── backend/
│   ├── config/
│   │   └── db.js                        # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js            # Register, Login, Logout, GetMe
│   │   ├── hotelController.js           # Hotel CRUD + search/filter
│   │   └── bookingController.js         # Availability check, Hold, Cancel
│   ├── jobs/
│   │   └── holdExpiryJob.js             # Cron: expire holds every 5 min
│   ├── middleware/
│   │   ├── auth.js                      # JWT protect + authorize(roles)
│   │   └── errorHandler.js             # Global error handler
│   ├── models/
│   │   ├── User.js                      # Guest / HotelAdmin / Superadmin
│   │   ├── Hotel.js                     # Hotel with geo + amenities
│   │   ├── RoomType.js                  # Category of rooms + base rate
│   │   ├── Room.js                      # Physical room entity
│   │   ├── Booking.js                   # State machine: HOLD→CONFIRMED→…
│   │   ├── InventoryCalendar.js         # Per-day inventory tracking
│   │   ├── PricingRule.js               # Configurable pricing strategies
│   │   └── Payment.js                   # Stripe/Razorpay abstraction
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── hotel.routes.js
│   │   └── booking.routes.js
│   ├── services/
│   │   ├── booking/
│   │   │   └── AvailabilityService.js   # Atomic room reservation (sessions)
│   │   ├── pricing/
│   │   │   └── YieldPricingEngine.js    # Strategy pattern: seasonal/demand/occupancy
│   │   └── notification/
│   │       └── NotificationService.js   # Observer pattern via EventEmitter
│   ├── utils/
│   │   ├── AppError.js                  # Operational error class
│   │   └── asyncHandler.js             # try/catch wrapper for controllers
│   ├── server.js                        # Express entry point
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── public/
    └── src/
        ├── components/
        │   ├── common/                  # Navbar, Layout, etc.
        │   ├── hotel/                   # HotelCard, HotelSearch, etc.
        │   ├── booking/                 # BookingForm, PriceSummary, etc.
        │   ├── auth/                    # LoginForm, RegisterForm
        │   └── admin/                   # Admin-specific UI
        ├── context/
        │   ├── AuthContext.jsx          # JWT auth state + rehydration
        │   └── BookingContext.jsx       # Search params + booking flow state
        ├── hooks/
        │   ├── useHotels.js             # Hotel fetch with filters
        │   └── useBookingFlow.js        # Availability → Hold → Confirm
        ├── pages/
        │   ├── HomePage.jsx
        │   ├── HotelsPage.jsx
        │   ├── HotelDetailPage.jsx
        │   ├── BookingPage.jsx
        │   ├── BookingConfirmationPage.jsx
        │   ├── MyBookingsPage.jsx
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   └── AdminDashboardPage.jsx
        ├── services/
        │   ├── api.js                   # Axios instance + interceptors
        │   ├── authService.js
        │   ├── hotelService.js
        │   └── bookingService.js
        └── App.jsx                      # Router + PrivateRoute guard
```

---

## API Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/auth/register` | Public | Register a new user |
| POST | `/api/v1/auth/login` | Public | Login and get JWT |
| POST | `/api/v1/auth/logout` | Public | Clear session cookie |
| GET | `/api/v1/auth/me` | Protected | Get current user |
| GET | `/api/v1/hotels` | Public | Search/filter hotels |
| POST | `/api/v1/hotels` | hotel_admin | Create a hotel |
| GET | `/api/v1/hotels/:id` | Public | Get hotel + room types |
| PATCH | `/api/v1/hotels/:id` | hotel_admin | Update hotel |
| POST | `/api/v1/bookings/check` | Public | Check availability + price quote |
| POST | `/api/v1/bookings` | guest | Create booking (HOLD) |
| GET | `/api/v1/bookings/my` | Protected | Get my bookings |
| GET | `/api/v1/bookings/:id` | Protected | Get single booking |
| PATCH | `/api/v1/bookings/:id/cancel` | Protected | Cancel a booking |

---

## Getting Started

### Backend

```bash
cd backend
cp .env.example .env   # fill in MONGO_URI and JWT_SECRET
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Key Design Patterns

| Pattern | Implementation |
|---------|---------------|
| **Strategy** | `YieldPricingEngine` — seasonal / demand / occupancy / LOS multipliers |
| **State Machine** | `Booking.transitionTo()` — enforces valid HOLD→CONFIRMED→CHECKED_OUT transitions |
| **Observer** | `NotificationService` — EventEmitter dispatches confirmation/cancellation emails |
| **Repository** | Service layer (`AvailabilityService`) abstracts DB operations with atomic sessions |
