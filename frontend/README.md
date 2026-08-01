# React Pharmacy Frontend

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Server runs at: `http://localhost:5173`

## Build

```bash
npm run build
```

## Project Structure

```
src/
├── components/      # Reusable UI components
├── pages/           # Page components (Login, Dashboard, etc.)
├── store/           # Redux store, slices
├── hooks/           # Custom React hooks
├── services/        # API services
├── utils/           # Helper functions
├── types/           # TypeScript types/interfaces
├── assets/          # Images, icons, etc.
├── App.tsx          # Root component
└── main.tsx         # Entry point
```

## Features

- React 18 with TypeScript
- Redux Toolkit for state management
- React Router v6 for navigation
- Axios for API calls
- Tailwind CSS for styling
- Socket.io for real-time features
- Google Maps integration

## Environment Variables

Create `.env.local`:

```
VITE_API_URL=http://localhost:3000/api
VITE_GOOGLE_MAPS_KEY=your-api-key
```
