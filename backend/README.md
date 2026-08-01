# NestJS Pharmacy Backend

## Structure

```
backend/
├── src/
│   ├── config/          # Configuration (DB, cache, etc.)
│   ├── modules/         # Feature modules (Auth, Users, Pharmacy, etc.)
│   │   ├── auth/
│   │   ├── users/
│   │   ├── pharmacies/
│   │   ├── medications/
│   │   ├── orders/
│   │   ├── cart/
│   │   ├── deliveries/
│   │   ├── payments/
│   │   ├── notifications/
│   │   ├── analytics/
│   │   └── geolocation/
│   ├── common/          # Shared (DTOs, Entities, Exceptions)
│   ├── decorators/      # Custom decorators
│   ├── guards/          # Auth guards
│   ├── interceptors/    # HTTP interceptors
│   ├── pipes/           # Validation pipes
│   ├── utils/           # Helper functions
│   ├── app.module.ts    # Root module
│   └── main.ts          # Entry point
├── test/                # E2E tests
├── package.json
├── tsconfig.json
└── README.md
```

## Install Dependencies

```bash
npm install
```

## Environment Setup

```bash
cp .env.example .env
# Edit .env with your values
```

## Development

```bash
# Start dev server with watch
npm run start:dev

# Build for production
npm run build

# Run production
npm run start:prod
```

## Testing

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## Linting & Formatting

```bash
npm run lint
```

## API Documentation

API will be available at: `http://localhost:3000/api`
Swagger docs: `http://localhost:3000/api/docs`
