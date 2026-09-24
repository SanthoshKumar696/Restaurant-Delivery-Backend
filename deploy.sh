#!/bin/bash

set -e

echo "======================================"
echo "Starting Restaurnat backend DDeployement"
echo "======================================"

cd /var/www/Restaurant-Delivery-Backend

echo "Pulling latest code ...."
git fetch origin main
git reset --hard origin/main

echo "installing dependencies..."
npm ci

echo "Generating Prisma Client"
npx prisma generate

echo "Running database migrations..."
npx prisma migrate deploy

echo "Building application..."
npm run build

echo "Restarting PM2..."
pm2 restart restaurant-backend 

echo "Checking application..."
sleep 3

pm2 status

echo "=============================="
echo "Deployment completed"
echo "=============================="
