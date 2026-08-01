# Pharmacy Platform - Geolocation & Delivery System

Ultra-modern platform for pharmacy geolocation, medication inventory management, and intelligent delivery system.

## 🎯 Project Overview

A comprehensive e-health platform enabling:
- **Patients**: Find pharmacies, order medications, track deliveries
- **Pharmacists**: Manage inventory, process orders
- **Drivers**: Real-time delivery tracking with geolocation
- **Admins**: Platform management and analytics

## 📦 Tech Stack

### Backend
- **Framework**: NestJS + TypeScript
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT + Passport
- **Real-time**: Socket.io
- **APIs**: Google Maps, MTN Mobile Money, Orange Money, Firebase, Nodemailer

### Frontend
- **Framework**: React 18 + TypeScript
- **State Management**: Redux Toolkit
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **HTTP**: Axios
- **Maps**: Google Maps API
- **Real-time**: Socket.io Client

### DevOps
- Docker & Docker Compose
- MongoDB 
- Environment-based configuration

## 📁 Project Structure

```
pharmacie/
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── modules/        # Feature modules
│   │   ├── common/         # Shared utilities
│   │   ├── config/         # Configuration
│   │   └── main.ts
│   ├── package.json
│   ├── Dockerfile
│   └── README.md
├── frontend/               # React App
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   └── services/
│   ├── package.json
│   ├── Dockerfile.dev
│   └── README.md
├── docker-compose.yml
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MongoDB (local or use docker-compose)

### 1. Setup Environment

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your API keys

# Frontend
cd ../frontend
cp .env.example .env.local
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Run Development Servers

**Option A: Local**
```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Option B: Docker**
```bash
docker-compose up
```

### 4. Access the Platform

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- MongoDB: localhost:27017

## 📋 Development Phases

### Phase 1: Infrastructure ✅
- [x] NestJS project structure
- [x] React + Vite setup
- [x] MongoDB schemas
- [ ] Environment configuration

### Phase 2: Authentication (Coming)
- JWT implementation
- User registration/login
- Role-based access control

### Phase 3-10: Features (Coming)
- User management
- Pharmacy geolocation
- Medication catalog
- Orders & Cart
- Payments integration
- Delivery system
- Notifications
- Admin dashboard

### Phase 11: Optimization (Coming)
- Testing
- Performance optimization
- Deployment

## 🔑 Key Features

### For Clients
- 🗺️ Find nearby pharmacies
- 💊 Browse medication catalog
- 🛒 Shopping cart & checkout
- 💳 Multiple payment methods
- 🚚 Real-time delivery tracking
- ⭐ Reviews & ratings

### For Pharmacists
- 📊 Inventory management
- 📦 Order processing
- 📈 Sales analytics
- 🔔 Real-time notifications
- 👥 Customer management

### For Drivers
- 🗺️ Real-time GPS tracking
- 📋 Delivery queue management
- 💬 Customer communication
- 💰 Earnings dashboard

### For Admins
- 👥 User management
- 🏥 Pharmacy management
- 📊 Platform analytics
- 💰 Payment management
- 🔐 System security

## 📚 API Documentation

### Authentication
```bash
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

### Users
```bash
GET /api/users/:id
PUT /api/users/:id
DELETE /api/users/:id
```

### Pharmacies
```bash
GET /api/pharmacies
GET /api/pharmacies/:id
GET /api/pharmacies/nearby?lat=X&lng=Y
POST /api/pharmacies
PUT /api/pharmacies/:id
```

### More endpoints documented in feature branches...

## 🧪 Testing

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

## 📖 Documentation

- [Backend Setup](./backend/README.md)
- [Frontend Setup](./frontend/README.md)
- [API Reference](#) (Coming)
- [Architecture Guide](#) (Coming)

## 🐳 Docker Commands

```bash
# Build and start all services
docker-compose up

# Build fresh images
docker-compose up --build

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Rate limiting
- Input validation & sanitization
- Environment variable management
- Role-based access control (RBAC)

## 🌐 External Services Integration

- **Google Maps API**: Geolocation and route optimization
- **MTN Mobile Money**: Payment processing
- **Orange Money**: Alternative payment method
- **Firebase**: Push notifications
- **Nodemailer**: Email notifications
- **Stripe** (optional): Credit card payments

## 📱 Platform Accessibility

- Responsive design (mobile, tablet, desktop)
- Touch-friendly UI
- Accessible navigation
- Multiple languages (extensible)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 👥 Team

- Architecture: Modern & Scalable
- Development: Phase-based approach
- Quality: Testing at each phase
- Deployment: Docker-ready

## 📞 Support & Contact

For questions or issues, please create an issue in the repository.

---

**Status**: Phase 1 ✅ Infrastructure Complete
**Next Phase**: Phase 2 - Authentication & Authorization

Made with ❤️ for modern pharmacy management.
