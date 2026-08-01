# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USERS & ROLES                             │
├──────────┬──────────┬──────────┬──────────────────────────────┤
│ Clients  │Pharmacist│  Driver  │      Administrator          │
└──────────┴──────────┴──────────┴──────────────────────────────┘
           │                    │
           └────────┬───────────┘
                    │
         ┌──────────▼─────────────┐
         │   FRONTEND (React)     │
         │ ─────────────────────  │
         │ • React Router v6      │
         │ • Redux Toolkit        │
         │ • Tailwind CSS         │
         │ • Axios HTTP Client    │
         │ • Socket.io Client     │
         │ • Google Maps          │
         └──────────┬──────────────┘
                    │
         ┌──────────▼─────────────────────────────────────┐
         │         API GATEWAY (NestJS)                   │
         │ ────────────────────────────────────────────── │
         │ • JWT Authentication                           │
         │ • CORS & Security Headers                      │
         │ • Rate Limiting                                │
         │ • Input Validation                             │
         │ • Global Error Handling                        │
         └──────────┬──────────────────────────────────────┘
                    │
        ┌───────────┼───────────┬──────────┬──────────┐
        │           │           │          │          │
        ▼           ▼           ▼          ▼          ▼
    ┌─────────┐┌─────────┐┌────────┐┌────────┐┌──────────┐
    │   Auth  ││ Users   ││Pharmacy││Medication│ Orders  │
    │ Module  ││ Module  ││Module  ││ Module ││ Module  │
    └─────────┘└─────────┘└────────┘└────────┘└──────────┘
        │           │           │          │          │
        └───────────┴───────────┴──────────┴──────────┘
                    │
        ┌───────────┼───────────┬──────────┬──────────┐
        │           │           │          │          │
        ▼           ▼           ▼          ▼          ▼
    ┌─────────┐┌─────────┐┌────────┐┌────────┐┌──────────┐
    │  Cart   ││Delivery ││ Payment││Notifs  ││Analytics │
    │ Module  ││ Module  ││ Module ││ Module ││ Module  │
    └─────────┘└─────────┘└────────┘└────────┘└──────────┘
        │           │           │          │          │
        └───────────┴───────────┴──────────┴──────────┘
                    │
         ┌──────────▼──────────────────────────────┐
         │      MONGODB DATABASE                  │
         │ ──────────────────────────────────── │
         │ • Users Collection                   │
         │ • Pharmacies Collection              │
         │ • Medications Collection             │
         │ • Orders Collection                  │
         │ • Deliveries Collection              │
         │ • Payments Collection                │
         │ • Notifications Collection           │
         │ • Prescriptions Collection           │
         │ • Reviews Collection                 │
         │ • Categories Collection              │
         └──────────────────────────────────────┘
                    │
        ┌───────────┼───────────────────┐
        │           │                   │
        ▼           ▼                   ▼
    ┌────────┐ ┌────────┐        ┌──────────┐
    │ Redis  │ │ Search │        │ Firebase │
    │(Cache) │ │ Engine │        │(Notifs)  │
    └────────┘ └────────┘        └──────────┘
        │
    ┌───┴──────────┬──────────┬──────────┐
    │              │          │          │
    ▼              ▼          ▼          ▼
┌─────────┐  ┌──────────┐ ┌──────┐ ┌──────────┐
│ Google  │  │ Payment  │ │Email │ │ SMS API  │
│  Maps   │  │ Gateways │ │(SMTP)│ │          │
│  API    │  │ MTN/Oran │ └──────┘ └──────────┘
└─────────┘  └──────────┘
```

## Module Dependencies

```
┌────────────────────────────────────────┐
│         APP MODULE (Root)              │
└────────────────────────────────────────┘
           │
    ┌──────┼──────┬────────┬────────┬────────┬──────────┐
    │      │      │        │        │        │          │
    ▼      ▼      ▼        ▼        ▼        ▼          ▼
 CONFIG  AUTH   USERS  PHARMACY  MEDICATION  ORDERS   CART
    │      │      │        │        │        │          │
    │      └──────┼────────┼────────┼────────┼──────────┘
    │             │        │        │        │
    ▼             ▼        ▼        ▼        ▼
┌────────┐  ┌──────────────────────────────┐
│DATABASE│  │    Delivery, Payments,       │
│ CONFIG │  │    Notifications, Analytics  │
└────────┘  └──────────────────────────────┘
```

## Request/Response Flow

```
┌──────────────────────────────────────────────────────────┐
│ 1. USER REQUEST (Frontend)                               │
│    POST /api/auth/login                                  │
│    { email, password }                                   │
└───────────────┬──────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────┐
│ 2. MIDDLEWARE PROCESSING                                 │
│    • CORS check                                          │
│    • Request validation                                  │
│    • Helmet security headers                             │
└───────────────┬──────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────┐
│ 3. ROUTE MATCHING & HANDLER                              │
│    POST /api/auth/login → AuthController.login()         │
└───────────────┬──────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────┐
│ 4. SERVICE LOGIC                                         │
│    AuthService.login()                                   │
│    • Find user by email                                  │
│    • Validate password (bcrypt)                          │
│    • Generate JWT token                                  │
└───────────────┬──────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────┐
│ 5. DATABASE QUERY                                        │
│    MongoDB: db.users.findOne({ email })                  │
└───────────────┬──────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────┐
│ 6. RESPONSE GENERATION                                   │
│    { user, token, expiresIn }                            │
└───────────────┬──────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────┐
│ 7. ERROR HANDLING (if error)                             │
│    HttpExceptionFilter catches and formats               │
│    { statusCode, message, timestamp }                    │
└───────────────┬──────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────┐
│ 8. FRONTEND RECEIVES                                     │
│    Status 200: Store token in localStorage               │
│    Status 401: Redirect to login                         │
│    Status 500: Show error toast                          │
└──────────────────────────────────────────────────────────┘
```

## Real-time Communication (Socket.io)

```
┌───────────────────────────────────────┐
│   Client (React + Socket.io)          │
├───────────────────────────────────────┤
│ • Listen: delivery:update             │
│ • Listen: notification:new            │
│ • Emit: location:update               │
│ • Emit: order:status:check            │
└───────────────┬───────────────────────┘
                │
        ┌───────▼────────┐
        │   Socket.io    │
        │   Namespace:   │
        │   /deliveries  │
        │   /orders      │
        │   /notifications
        └───────┬────────┘
                │
┌───────────────▼───────────────────────┐
│  Backend (NestJS + Socket.io)         │
├───────────────────────────────────────┤
│ • Delivery status updates             │
│ • Order notifications                 │
│ • Real-time location tracking         │
│ • Chat functionality                  │
└───────────────────────────────────────┘
```

## Data Models

### User
```json
{
  "_id": "ObjectId",
  "email": "user@example.com",
  "password": "bcrypt_hash",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "role": "client|pharmacist|driver|admin",
  "isActive": true,
  "createdAt": "2026-06-06T...",
  "updatedAt": "2026-06-06T..."
}
```

### Pharmacy
```json
{
  "_id": "ObjectId",
  "name": "Pharmacy Name",
  "owner": "userId",
  "address": "123 Main St",
  "coordinates": {
    "lat": 48.8566,
    "lng": 2.3522
  },
  "phone": "+1234567890",
  "hours": {
    "monday": "09:00-19:00",
    "tuesday": "09:00-19:00"
  },
  "isOpen": true,
  "rating": 4.5,
  "medications": ["medId1", "medId2"],
  "createdAt": "2026-06-06T...",
  "updatedAt": "2026-06-06T..."
}
```

### Order
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "pharmacyId": "ObjectId",
  "items": [
    {
      "medicationId": "ObjectId",
      "quantity": 2,
      "price": 25.50
    }
  ],
  "totalAmount": 51.00,
  "status": "pending|confirmed|preparing|ready|shipped|delivered",
  "deliveryAddress": "456 Oak St",
  "paymentMethod": "mtn_mobile_money|orange_money|card",
  "paymentStatus": "pending|completed|failed",
  "deliveryId": "ObjectId",
  "createdAt": "2026-06-06T...",
  "updatedAt": "2026-06-06T..."
}
```

## Security Layers

```
┌─────────────────────────────────────┐
│ Layer 1: Network Security           │
│ • HTTPS/TLS                         │
│ • CORS policy                       │
│ • Helmet headers                    │
└─────────────────────────────────────┘
         │
┌─────────▼─────────────────────────┐
│ Layer 2: Authentication            │
│ • JWT tokens                       │
│ • Refresh token rotation           │
│ • Session management               │
└─────────────────────────────────────┘
         │
┌─────────▼─────────────────────────┐
│ Layer 3: Authorization             │
│ • Role-based access control        │
│ • Resource ownership checks        │
│ • Permission validation            │
└─────────────────────────────────────┘
         │
┌─────────▼─────────────────────────┐
│ Layer 4: Data Validation           │
│ • Input sanitization               │
│ • Type checking                    │
│ • Range validation                 │
└─────────────────────────────────────┘
         │
┌─────────▼─────────────────────────┐
│ Layer 5: Encryption                │
│ • Password hashing (bcrypt)        │
│ • Data encryption at rest          │
│ • Sensitive data masking           │
└─────────────────────────────────────┘
```

## Deployment Architecture

```
┌────────────────────────────────────────────────────┐
│        Production Environment (Cloud)              │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────────────────────────────────────┐     │
│  │     Load Balancer / CDN                  │     │
│  │     (Cloud Provider / Cloudflare)        │     │
│  └──────────────────┬───────────────────────┘     │
│                     │                              │
│     ┌───────────────┼───────────────┐             │
│     │               │               │             │
│  ┌──▼─────────┐ ┌──▼────────┐ ┌──▼────────┐     │
│  │ Frontend   │ │ Backend   │ │ Backend   │     │
│  │ (React)    │ │ (NestJS)  │ │ (NestJS)  │     │
│  │ Container  │ │ Container │ │ Container │     │
│  └────────────┘ └───────────┘ └───────────┘     │
│                                                    │
│  ┌──────────────────────────────────────────┐     │
│  │     Database (MongoDB Atlas)             │     │
│  │     + Redis Cache                        │     │
│  └──────────────────────────────────────────┘     │
│                                                    │
│  ┌──────────────────────────────────────────┐     │
│  │  Monitoring & Logging (ELK / Datadog)    │     │
│  └──────────────────────────────────────────┘     │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

This architecture is designed for:
- ✅ **Scalability**: Modular design, stateless services
- ✅ **Security**: Multiple layers of protection
- ✅ **Performance**: Caching, optimization, CDN
- ✅ **Reliability**: Error handling, monitoring, backups
- ✅ **Maintainability**: Clean code, documentation, tests
