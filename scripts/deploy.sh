#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f .env.production ]; then
  export $(cat .env.production | grep -v '^#' | xargs)
else
  echo "Error: .env.production file not found"
  exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running"
  exit 1
fi

# Create required directories
mkdir -p nginx/ssl nginx/logs

# Generate self-signed SSL certificate if not exists
if [ ! -f nginx/ssl/server.crt ] || [ ! -f nginx/ssl/server.key ]; then
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/server.key \
    -out nginx/ssl/server.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
fi

# Build and start containers
echo "Building and starting containers..."
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "Running database migrations..."
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Seed database if needed
if [ "$SEED_DATABASE" = "true" ]; then
  echo "Seeding database..."
  docker-compose -f docker-compose.prod.yml exec app npx prisma db seed
fi

# Print container status
echo "Container status:"
docker-compose -f docker-compose.prod.yml ps

# Print logs
echo "Application logs:"
docker-compose -f docker-compose.prod.yml logs app

echo "Deployment completed successfully!"
