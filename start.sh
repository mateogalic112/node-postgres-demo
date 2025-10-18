#!/bin/bash
set -e

# Load environment variables from .env.local if it exists
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

# Get the current directory name to use as container name
CONTAINER_NAME=$(basename "$(pwd)")

# Use environment variables with fallbacks
POSTGRES_DB_NAME=${POSTGRES_DB:-${CONTAINER_NAME}}
POSTGRES_USER_NAME=${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD_VALUE=${POSTGRES_PASSWORD:-postgres}

# Check if the container exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  # Check if it's running
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "'${CONTAINER_NAME}' is already running."
  else
    echo "Starting existing '${CONTAINER_NAME}' container..."
    docker start ${CONTAINER_NAME} > /dev/null

    echo "Waiting for PostgreSQL to be ready..."
    until docker exec ${CONTAINER_NAME} pg_isready -U postgres >/dev/null 2>&1; do
      sleep 1
    done

    echo "'${CONTAINER_NAME}' is now running."
  fi
else
  echo "Stopping all containers except '${CONTAINER_NAME}'..."
  docker ps -q | xargs -r docker inspect --format '{{.Name}} {{.Id}}' 2>/dev/null \
    | grep -v "/${CONTAINER_NAME}" \
    | awk '{print $2}' \
    | xargs -r docker stop > /dev/null 2>&1

  echo "Creating and starting new '${CONTAINER_NAME}' container..."
  echo "Using database: ${POSTGRES_DB_NAME}"
  docker run -d \
    --name ${CONTAINER_NAME} \
    -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD_VALUE} \
    -e POSTGRES_USER=${POSTGRES_USER_NAME} \
    -e POSTGRES_DB=${POSTGRES_DB_NAME} \
    -p 5432:5432 \
    pgvector/pgvector:pg17 > /dev/null

  echo "Waiting for PostgreSQL to be ready..."
  until docker exec ${CONTAINER_NAME} pg_isready -U postgres >/dev/null 2>&1; do
    sleep 1
  done

  echo "'${CONTAINER_NAME}' is up and ready!"
fi

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
  echo "Warning: Stripe CLI not found. Please install it first:"
  echo "brew install stripe/stripe-cli/stripe"
  exit 1
fi

# Start Stripe webhook listener in new terminal
echo "Starting Stripe webhook listener in new terminal..."
osascript -e 'tell application "Terminal" to do script "cd '$(pwd)' && echo \"Stripe webhook listener starting...\" && stripe listen --forward-to localhost:4000/api/v1/payments/orders"'

echo ""
echo "✅ Setup complete!"
echo "📦 PostgreSQL container: ${CONTAINER_NAME}"
echo "🔗 Stripe webhook listener: Started in new terminal"
