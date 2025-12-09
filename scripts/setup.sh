#!/bin/bash

# FileShare Setup Script
# This script helps set up the FileShare application

echo "======================================"
echo "   FileShare Application Setup"
echo "======================================"
echo ""

# Check Node.js
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi
NODE_VERSION=$(node -v)
echo "✅ Node.js $NODE_VERSION found"

# Check PostgreSQL
echo "Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL 15+ from https://www.postgresql.org"
    exit 1
fi
PSQL_VERSION=$(psql --version)
echo "✅ PostgreSQL found: $PSQL_VERSION"

echo ""
echo "======================================"
echo "   Database Setup"
echo "======================================"
echo ""

# Database setup
read -p "Enter PostgreSQL username (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -sp "Enter PostgreSQL password: " DB_PASSWORD
echo ""

read -p "Enter database name (default: fileshare): " DB_NAME
DB_NAME=${DB_NAME:-fileshare}

# Create database
echo "Creating database..."
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Database created successfully"
else
    echo "⚠️  Database may already exist"
fi

# Run migrations
echo "Running database migrations..."
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -f database/migrations/001_initial_schema.sql
if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully"
else
    echo "❌ Migration failed"
    exit 1
fi

echo ""
echo "======================================"
echo "   Backend Setup"
echo "======================================"
echo ""

# Backend setup
cd backend

if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env

    # Update .env with user inputs
    sed -i "s/DB_USER=postgres/DB_USER=$DB_USER/" .env 2>/dev/null || sed -i '' "s/DB_USER=postgres/DB_USER=$DB_USER/" .env
    sed -i "s/DB_PASSWORD=your_password_here/DB_PASSWORD=$DB_PASSWORD/" .env 2>/dev/null || sed -i '' "s/DB_PASSWORD=your_password_here/DB_PASSWORD=$DB_PASSWORD/" .env
    sed -i "s/DB_NAME=fileshare/DB_NAME=$DB_NAME/" .env 2>/dev/null || sed -i '' "s/DB_NAME=fileshare/DB_NAME=$DB_NAME/" .env

    # Generate random JWT secret
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env 2>/dev/null || sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env

    echo "✅ .env file created and configured"
else
    echo "⚠️  .env file already exists, skipping creation"
fi

echo "Installing backend dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Backend installation failed"
    exit 1
fi

cd ..

echo ""
echo "======================================"
echo "   Frontend Setup"
echo "======================================"
echo ""

# Frontend setup
cd frontend

echo "Installing frontend dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Frontend installation failed"
    exit 1
fi

cd ..

echo ""
echo "======================================"
echo "   Root Dependencies (Optional)"
echo "======================================"
echo ""

echo "Installing root dependencies for concurrent running..."
npm install
echo "✅ Root dependencies installed"

echo ""
echo "======================================"
echo "   Setup Complete!"
echo "======================================"
echo ""
echo "To start the application:"
echo ""
echo "Option 1 - Run both together (from project root):"
echo "  npm run dev"
echo ""
echo "Option 2 - Run separately (two terminals):"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "Then open: http://localhost:5173"
echo ""
echo "Happy coding! 🚀"
echo ""
