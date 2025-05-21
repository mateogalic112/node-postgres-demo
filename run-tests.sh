#!/bin/bash

# Exit on error
set -e

echo "Starting test database container..."
docker-compose -f docker-compose.test.yml up -d

# Wait for database to be ready
echo "Waiting for database to be ready..."
until pg_isready -h localhost -p 5433 -U postgres; do
  sleep 1
done

NODE_ENV=test npx jest --detectOpenHandles

# Store the test exit code
TEST_EXIT_CODE=$?

echo "Stopping test database container..."
docker-compose -f docker-compose.test.yml down

# Exit with the test exit code
exit $TEST_EXIT_CODE 