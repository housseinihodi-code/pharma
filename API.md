# API Documentation - Pharmacy Platform

Base URL: `http://localhost:3000/api`

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Auth Module

#### Register
- **POST** `/auth/register`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "secure_password",
    "firstName": "John",
    "lastName": "Doe"
  }
  ```
- **Response**: `{ user, token }`

#### Login
- **POST** `/auth/login`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "secure_password"
  }
  ```
- **Response**: `{ user, token }`

#### Refresh Token
- **POST** `/auth/refresh`
- **Headers**: `Authorization: Bearer <refresh_token>`
- **Response**: `{ token }`

---

### Users Module

#### Get User Profile
- **GET** `/users/:id`
- **Auth**: Required
- **Response**: `{ id, email, firstName, lastName, role, ... }`

#### Update User Profile
- **PUT** `/users/:id`
- **Auth**: Required
- **Body**:
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890"
  }
  ```

#### Delete User
- **DELETE** `/users/:id`
- **Auth**: Required (Admin or self)

---

### Pharmacies Module (Coming)

#### Get All Pharmacies
- **GET** `/pharmacies`
- **Query**: `?limit=10&offset=0&search=name`
- **Response**: `{ data: [], total: 0 }`

#### Get Nearby Pharmacies
- **GET** `/pharmacies/nearby`
- **Query**: `?lat=48.8566&lng=2.3522&radius=5`
- **Response**: `{ data: [], total: 0 }`

#### Get Pharmacy Details
- **GET** `/pharmacies/:id`
- **Response**: `{ id, name, address, hours, ratings, ... }`

---

### Medications Module (Coming)

#### Search Medications
- **GET** `/medications`
- **Query**: `?q=ibuprofen&category=pain_relief`
- **Response**: `{ data: [], total: 0 }`

#### Get Medication Details
- **GET** `/medications/:id`
- **Response**: `{ id, name, description, price, stock, ... }`

---

### Orders Module (Coming)

#### Create Order
- **POST** `/orders`
- **Auth**: Required
- **Body**:
  ```json
  {
    "items": [
      { "medicationId": "id", "quantity": 2 }
    ],
    "pharmacyId": "pharmacy-id",
    "deliveryAddress": "123 Main St"
  }
  ```

#### Get Orders
- **GET** `/orders`
- **Auth**: Required
- **Query**: `?status=pending&limit=10`

#### Get Order Details
- **GET** `/orders/:id`
- **Auth**: Required

---

### Payments Module (Coming)

#### Initiate Payment
- **POST** `/payments/initiate`
- **Auth**: Required
- **Body**:
  ```json
  {
    "orderId": "order-id",
    "method": "mtn_mobile_money",
    "amount": 5000
  }
  ```

#### Confirm Payment
- **POST** `/payments/confirm`
- **Auth**: Required
- **Body**:
  ```json
  {
    "transactionId": "trans-id",
    "code": "verification_code"
  }
  ```

---

### Deliveries Module (Coming)

#### Get Delivery Status
- **GET** `/deliveries/:id`
- **Auth**: Required
- **Response**: `{ id, status, driver, location, estimatedTime, ... }`

#### Track Delivery Real-time
- **WebSocket** `/socket.io`
- **Event**: `delivery:update`

---

### Notifications Module (Coming)

#### Get Notifications
- **GET** `/notifications`
- **Auth**: Required
- **Query**: `?unread=true&limit=10`

#### Mark as Read
- **PATCH** `/notifications/:id/read`
- **Auth**: Required

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "timestamp": "2026-06-06T16:43:35.704+01:00"
}
```

### Common Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

---

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: 
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

---

## Pagination

All list endpoints support pagination:

```
GET /endpoint?limit=10&offset=0
```

Response:
```json
{
  "data": [],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 50,
    "pages": 5
  }
}
```

---

## WebSocket Events

### Connect
```javascript
socket.on('connect', () => {
  console.log('Connected to real-time server');
});
```

### Delivery Updates
```javascript
socket.on('delivery:update', (data) => {
  console.log('Delivery status:', data);
});
```

### Notifications
```javascript
socket.on('notification:new', (data) => {
  console.log('New notification:', data);
});
```

---

## Integration Examples

### cURL
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

### JavaScript/Fetch
```javascript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
});
const data = await response.json();
console.log(data);
```

### JavaScript/Axios
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    Authorization: `Bearer ${token}`
  }
});

const { data } = await api.post('/auth/login', {
  email: 'user@example.com',
  password: 'password'
});
```

---

**Note**: This documentation is a work in progress. Endpoints will be fully implemented in subsequent phases.
