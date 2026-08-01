.PHONY: help setup install dev build test docker-up docker-down clean

help:
	@echo "🏥 Pharmacy Platform - Available Commands"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make setup          - Initial project setup"
	@echo "  make install        - Install all dependencies"
	@echo ""
	@echo "Development:"
	@echo "  make dev            - Start both frontend and backend in watch mode"
	@echo "  make dev-backend    - Start backend in watch mode"
	@echo "  make dev-frontend   - Start frontend in watch mode"
	@echo ""
	@echo "Building & Production:"
	@echo "  make build          - Build both projects"
	@echo "  make build-backend  - Build backend"
	@echo "  make build-frontend - Build frontend"
	@echo ""
	@echo "Testing:"
	@echo "  make test           - Run all tests"
	@echo "  make test-backend   - Run backend tests"
	@echo "  make test-frontend  - Run frontend tests"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up      - Start services with docker-compose"
	@echo "  make docker-down    - Stop docker services"
	@echo "  make docker-build   - Build docker images"
	@echo ""
	@echo "Maintenance:"
	@echo "  make lint           - Run linters"
	@echo "  make clean          - Clean build artifacts"

setup:
	@bash setup.sh

install:
	@echo "📦 Installing backend dependencies..."
	@cd backend && npm install
	@echo "📦 Installing frontend dependencies..."
	@cd frontend && npm install
	@echo "✅ All dependencies installed!"

dev:
	@echo "🚀 Starting development servers..."
	@echo "⚠️  Run these commands in separate terminals:"
	@echo "   1. cd backend && npm run start:dev"
	@echo "   2. cd frontend && npm run dev"

dev-backend:
	@cd backend && npm run start:dev

dev-frontend:
	@cd frontend && npm run dev

build:
	@echo "🏗️  Building backend..."
	@cd backend && npm run build
	@echo "🏗️  Building frontend..."
	@cd frontend && npm run build
	@echo "✅ Build complete!"

build-backend:
	@cd backend && npm run build

build-frontend:
	@cd frontend && npm run build

test:
	@echo "🧪 Running tests..."
	@cd backend && npm test
	@cd frontend && npm test

test-backend:
	@cd backend && npm test

test-frontend:
	@cd frontend && npm test

lint:
	@echo "🔍 Running linters..."
	@cd backend && npm run lint
	@cd frontend && npm run lint

docker-up:
	@echo "🐳 Starting Docker containers..."
	@docker-compose up

docker-down:
	@echo "🛑 Stopping Docker containers..."
	@docker-compose down

docker-build:
	@echo "🏗️  Building Docker images..."
	@docker-compose build

clean:
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf backend/dist backend/node_modules
	@rm -rf frontend/dist frontend/node_modules
	@echo "✅ Cleanup complete!"

.DEFAULT_GOAL := help
