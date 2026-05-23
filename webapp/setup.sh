#!/bin/bash
set -e

echo "=== GH0ST_B0Y Web App Setup ==="

# Copy env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "[1/4] .env created from example — fill in your secrets"
else
  echo "[1/4] .env already exists"
fi

# Install deps
echo "[2/4] Installing dependencies..."
npm install

# Generate Prisma client + push schema
echo "[3/4] Setting up database..."
npx prisma generate
npx prisma db push

echo "[4/4] Done!"
echo ""
echo "  Start dev server:  npm run dev"
echo "  Open:              http://localhost:3000"
echo ""
echo "  Required secrets in .env:"
echo "    NEXTAUTH_SECRET  — run: openssl rand -base64 32"
echo "    STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET"
echo "    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"
echo "    PAYMENT_RECEIVER_ADDRESS"
