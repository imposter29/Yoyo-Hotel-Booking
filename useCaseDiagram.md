# Use Case Diagram — Hotel Room Booking & Yield Pricing System

## Actors

| Actor | Type | Description |
|-------|------|-------------|
| Guest | Primary | Searches, books, and manages reservations |
| Admin | Primary | Manages rooms, pricing rules, and inventory |
| Payment Gateway | External | Processes payments and refunds |
| Scheduler System | Automated | Runs background jobs (hold expiry, pricing, reminders) |

---

## Use Cases by Actor

### Guest
| ID | Use Case |
|----|----------|
| UC-G01 | Register Account |
| UC-G02 | Login |
| UC-G03 | Search Rooms |
| UC-G04 | Check Room Availability |
| UC-G05 | View Dynamic Pricing |
| UC-G06 | Place Room Hold |
| UC-G07 | Book Room |
| UC-G08 | Add Add-On Services |
| UC-G09 | Make Payment |
| UC-G10 | View Booking Details |
| UC-G11 | Modify Booking |
| UC-G12 | Cancel Booking |
| UC-G13 | View Invoice |
| UC-G14 | View Booking History |

### Admin
| ID | Use Case |
|----|----------|
| UC-A01 | Login (Admin) |
| UC-A02 | Manage Hotels |
| UC-A03 | Manage Room Types |
| UC-A04 | Manage Rooms |
| UC-A05 | View Room Inventory |
| UC-A06 | Manage Pricing Rules |
| UC-A07 | Manage Seasons |
| UC-A08 | Manage Cancellation Policies |
| UC-A09 | View All Bookings |
| UC-A10 | Override Booking Status |
| UC-A11 | View Revenue Reports |
| UC-A12 | Manage Add-On Services |
| UC-A13 | Trigger Pricing Recalculation |

### Payment Gateway
| ID | Use Case |
|----|----------|
| UC-P01 | Process Payment |
| UC-P02 | Process Refund |
| UC-P03 | Send Payment Webhook |

### Scheduler System
| ID | Use Case |
|----|----------|
| UC-S01 | Release Expired Holds |
| UC-S02 | Nightly Pricing Recalculation |
| UC-S03 | Send Check-In Reminders |
| UC-S04 | Auto Check-Out |
| UC-S05 | Generate Daily Reports |

---

## PlantUML Use Case Diagram

```plantuml
@startuml

left to right direction

actor Guest
actor Admin
actor "Payment Gateway" as PayGW
actor "Scheduler System" as Scheduler

package "Guest Portal" {
  usecase "Register Account" as UC_G01
  usecase "Login" as UC_G02
  usecase "Search Rooms" as UC_G03
  usecase "Check Room Availability" as UC_G04
  usecase "View Dynamic Pricing" as UC_G05
  usecase "Place Room Hold" as UC_G06
  usecase "Book Room" as UC_G07
  usecase "Add Add-On Services" as UC_G08
  usecase "Make Payment" as UC_G09
  usecase "View Booking Details" as UC_G10
  usecase "Modify Booking" as UC_G11
  usecase "Cancel Booking" as UC_G12
  usecase "View Invoice" as UC_G13
  usecase "View Booking History" as UC_G14
}

package "Admin Portal" {
  usecase "Login (Admin)" as UC_A01
  usecase "Manage Hotels" as UC_A02
  usecase "Manage Room Types" as UC_A03
  usecase "Manage Rooms" as UC_A04
  usecase "View Room Inventory" as UC_A05
  usecase "Manage Pricing Rules" as UC_A06
  usecase "Manage Seasons" as UC_A07
  usecase "Manage Cancellation Policies" as UC_A08
  usecase "View All Bookings" as UC_A09
  usecase "Override Booking Status" as UC_A10
  usecase "View Revenue Reports" as UC_A11
  usecase "Manage Add-On Services" as UC_A12
  usecase "Trigger Pricing Recalculation" as UC_A13
}

package "Payment Processing" {
  usecase "Process Payment" as UC_P01
  usecase "Process Refund" as UC_P02
  usecase "Send Payment Webhook" as UC_P03
}

package "Automated Jobs" {
  usecase "Release Expired Holds" as UC_S01
  usecase "Nightly Pricing Recalculation" as UC_S02
  usecase "Send Check-In Reminders" as UC_S03
  usecase "Auto Check-Out" as UC_S04
  usecase "Generate Daily Reports" as UC_S05
}

Guest --> UC_G01
Guest --> UC_G02
Guest --> UC_G03
Guest --> UC_G04
Guest --> UC_G05
Guest --> UC_G06
Guest --> UC_G07
Guest --> UC_G08
Guest --> UC_G09
Guest --> UC_G10
Guest --> UC_G11
Guest --> UC_G12
Guest --> UC_G13
Guest --> UC_G14

Admin --> UC_A01
Admin --> UC_A02
Admin --> UC_A03
Admin --> UC_A04
Admin --> UC_A05
Admin --> UC_A06
Admin --> UC_A07
Admin --> UC_A08
Admin --> UC_A09
Admin --> UC_A10
Admin --> UC_A11
Admin --> UC_A12
Admin --> UC_A13

PayGW --> UC_P01
PayGW --> UC_P02
PayGW --> UC_P03

Scheduler --> UC_S01
Scheduler --> UC_S02
Scheduler --> UC_S03
Scheduler --> UC_S04
Scheduler --> UC_S05

UC_G03 ..> UC_G04 : <<include>>
UC_G04 ..> UC_G05 : <<include>>
UC_G06 ..> UC_G04 : <<include>>
UC_G07 ..> UC_G06 : <<include>>
UC_G07 ..> UC_G09 : <<include>>
UC_G07 ..> UC_G08 : <<extend>>
UC_G09 ..> UC_P01 : <<include>>
UC_G12 ..> UC_P02 : <<include>>
UC_G10 ..> UC_G13 : <<extend>>
UC_P03 ..> UC_G07 : <<extend>>
UC_A06 ..> UC_A07 : <<include>>

@enduml
```
