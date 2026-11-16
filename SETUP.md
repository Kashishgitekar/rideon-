# RideOn setup

## Local development

1. Copy `server/.env.example` to `server/.env`.
2. Copy `client/.env.example` to `client/.env`.
3. Set `MONGODB_URI` and a long random `JWT_SECRET`.
4. Add `VITE_GOOGLE_MAPS_API_KEY` if route autocomplete is required.
5. Run:

```powershell
npm run install:all
npm run dev
```

Seed sample vehicles with `npm run seed --prefix server`.

## Docker

Copy `.env.example` to `.env` at the repository root and set `JWT_SECRET`.
Then run:

```powershell
docker compose up --build
```

The client is available at `http://localhost` and the API health check is
available at `http://localhost:5000/api/health`.

## Payments

The current application records payment state but does not claim a payment
success without a configured provider. Set `PAYMENT_PROVIDER` and the provider
secret values in `server/.env` before adding a gateway-specific checkout route.
Never expose payment secrets through `client/.env`.

## Production checklist

- Use managed MongoDB and a strong unique `JWT_SECRET`.
- Restrict `CLIENT_URL` to the deployed frontend origin.
- Restrict the Google Maps browser key by domain and API.
- Add HTTPS and provider webhooks before accepting real payments.
- Run `npm test --prefix server` and `npm run build --prefix client`.
