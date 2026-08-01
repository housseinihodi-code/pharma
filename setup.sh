#!/bin/bash

set -e

echo "🚀 Setting up Pharmacy Platform..."

# Setup Backend
echo -e "\n📦 Setting up Backend..."
cd backend
cp .env.example .env
echo "✅ Backend environment configured"
cd ..

# Setup Frontend  
echo -e "\n📦 Setting up Frontend..."
cd frontend
cp .env.example .env.local
echo "✅ Frontend environment configured"
cd ..

echo -e "\n✨ Setup complete!"
echo -e "\n📝 Next steps:"
echo -e "   1. Update .env files with your API keys"
echo -e "   2. Install dependencies:"
echo -e "      - Backend: cd backend && npm install"
echo -e "      - Frontend: cd frontend && npm install"
echo -e "   3. Start development servers:"
echo -e "      - Backend: cd backend && npm run start:dev"
echo -e "      - Frontend: cd frontend && npm run dev"
echo -e "   4. Or use Docker: docker-compose up\n"
