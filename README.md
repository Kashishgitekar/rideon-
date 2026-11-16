# RideOn

RideOn is a full-stack vehicle rental starter platform. It includes a React/Vite customer experience and an Express/MongoDB API with authentication, vehicle discovery, booking availability checks, and role-based access.

## Run locally

1. Install Node.js 20+ and MongoDB.
2. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI`, `JWT_SECRET`, and `GOOGLE_MAPS_API_KEY`. Copy `client/.env.example` to `client/.env` and set `VITE_GOOGLE_MAPS_API_KEY`.
3. Install dependencies:

   ```powershell
   npm install
   npm run install:all
   ```

4. Start both applications:

   ```powershell
   npm run dev
   ```

   The client runs at `http://localhost:5173` and the API at `http://localhost:5000`.

5. Add local demo data when the database is empty:

   ```powershell
   npm run seed --prefix server
   ```

   Demo customer: `customer@rideon.local` / `RideOnUser123!`

## Architecture

- `client/src`: React pages, reusable UI, auth context, and API client.
- `server/src/models`: Mongoose collections.
- `server/src/routes`: REST endpoints.
- `server/src/middleware`: JWT authentication, authorization, validation, and error handling.
- `server/src/services`: business rules such as booking price calculation.

The current vertical slice supports registration, login, vehicle search, vehicle details, booking creation, booking history, and owner/admin protected endpoints. Booking checkout includes Google Places autocomplete and a driving route map. In Google Cloud, enable Maps JavaScript API, Places API, Geocoding API, and Routes API, and attach billing to the project. Restrict the `VITE_` browser key by HTTP referrer (`http://localhost:5173/*` and your production domain); keep the server key private.

The app also includes the first ride-hailing vertical slice at `/ride`: riders can request a bike, auto, or car with an upfront fare estimate, while driver accounts can view available rides, accept them, and update ride status through `/api/rides`. Live GPS tracking, driver verification, payments, notifications, and surge pricing are the next production milestones.

Driver workflow is available through the driver dashboard after registering with account type `Driver`. Drivers submit vehicle and license details through `PUT /api/drivers/me`; an admin verifies them with `PATCH /api/drivers/:id/verify`, after which the driver can go online and accept matching ride requests.

## ML recommendation concept

The customer dashboard includes personalized vehicle recommendations. The API endpoint `GET /api/vehicles/recommendations` uses a content-based scoring model built from the customer's booking history. It compares category, fuel type, transmission, price, and seat count, then returns ranked vehicles with a human-readable reason. The scoring implementation lives in `server/src/services/recommendations.js`, so the feature can later be upgraded with learned weights or a separate model service without changing the frontend contract.

## Demo video walkthrough (6–8 minutes)

Use this scene plan to record a product-style walkthrough with OBS Studio or the
Windows Snipping Tool screen recorder. Record the browser at
`http://localhost:5173` and the terminal together, and rehearse each scene once
before recording.

### Recording prerequisites

1. Start MongoDB, then run `npm run dev` so the API (port 5000) and the client
   (port 5173) are both up.
2. Seed demo data with `npm run seed --prefix server` if the database is empty.
3. Have the seeded demo customer, a fresh test email, and the admin account
   ready before recording starts.
4. Privacy: never show real passwords, API secrets, personal documents, or real
   payment details on screen. Blur or crop any sensitive field.

### Scenes

**Scene 1 — Brand and home page (0:00–0:45)**

- On screen: open `http://localhost:5173`. Show the black-and-gold header, hero
  banner, the primary “Book a ride / Rent a vehicle” actions, and featured
  vehicle cards.
- Narration: “Welcome to RideOn, a premium vehicle rental platform. Customers
  can explore available cars and bikes, compare daily prices, and begin a
  booking.”

**Scene 2 — Explore and filter vehicles (0:45–1:35)**

- On screen: click **Rent a vehicle** to open the listing page. Type a search
  term, choose a category, and enter a maximum daily price in **Max ₹/day**.
- Narration: “The listing page retrieves vehicles from the Express API and
  MongoDB. Search, category, fuel, transmission, seat count, and price filters
  help customers narrow the results.”

**Scene 3 — Vehicle details (1:35–2:10)**

- On screen: open a vehicle card. Scroll through the image, description,
  specifications, rating, and rider reviews, then back out.
- Narration: “Each vehicle has its own details page, including category, seats,
  fuel type, transmission, location, and daily rental price.”

**Scene 4 — Account creation and login (2:10–2:55)**

- On screen: register a new customer account via **Sign in → Create an
  account**, sign out from the header, then sign back in.
- Narration: “RideOn supports account registration and login. Passwords are
  hashed on the server with bcrypt, and authenticated API requests use a signed
  JWT stored in the client session.”

**Scene 5 — Create a booking (2:55–3:55)**

- On screen: open a vehicle and select **Book this vehicle**. Enter pickup and
  drop-off locations, pickup/return dates, passenger count, and a payment
  method. Submit.
- Narration: “The booking form collects the trip details. The backend validates
  the dates and calculates the rental duration and total using the vehicle's
  stored daily rate.”

**Scene 6 — Customer dashboard (3:55–4:45)**

- On screen: open **Dashboard**. Show the bookings list with status chips and
  totals. Use the demo payment path only if you understand it does not charge
  real money.
- Narration: “Customers can view their booking status and payment status, cancel
  eligible bookings, and use the demo payment path. The demo path only marks the
  booking as paid in the local database.”

**Scene 7 — Admin dashboard (4:45–6:10)**

- On screen: sign out, then log in with the seeded admin account. Open
  **Dashboard** to reach the admin console. Show the overview metrics and
  revenue chart, the booking status selector, driver verification, and vehicle
  availability toggles.
- Narration: “Administrators can review booking requests, update their status,
  manage vehicle availability, and verify driver partners. Admin routes are
  protected by role-based middleware.”

**Scene 8 — Integrations and production checklist (6:10–7:00)**

- On screen: show `server/.env.example`, `client/.env.example`, and the setup
  notes in `SETUP.md`.
- Narration: “Razorpay order creation is scaffolded and requires test
  credentials plus the browser checkout integration before real checkout.
  Google Maps and secure document storage also require API keys and production
  configuration. Never collect real identity documents through public URLs.”

### Before publishing the recording

- Re-record any segment where a real password, secret, or personal document is
  visible.
- Confirm the seeded demo data contains no real names, phone numbers, or IDs.
- Export at 1080p and check audio levels before sharing.
