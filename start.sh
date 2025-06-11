#!/bin/bash
set -e

# Check if the container exists
if docker ps -a --format '{{.Names}}' | grep -q '^node-postgres-demo$'; then
  # Check if it's running
  if docker ps --format '{{.Names}}' | grep -q '^node-postgres-demo$'; then
    echo "'node-postgres-demo' is already running."
  else
    echo "Starting existing 'node-postgres-demo' container..."
    docker start node-postgres-demo > /dev/null

    echo "Waiting for PostgreSQL to be ready..."
    until docker exec node-postgres-demo pg_isready -U postgres >/dev/null 2>&1; do
      sleep 1
    done

    echo "'node-postgres-demo' is now running."
  fi
else
  echo "Stopping all containers except 'node-postgres-demo'..."
  docker ps -q | xargs -r docker inspect --format '{{.Name}} {{.Id}}' 2>/dev/null \
    | grep -v '/node-postgres-demo' \
    | awk '{print $2}' \
    | xargs -r docker stop > /dev/null 2>&1

  echo "Creating and starting new 'node-postgres-demo' container..."
  docker run -d \
    --name node-postgres-demo \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_DB=node-postgres-demo \
    -p 5432:5432 \
    postgres > /dev/null

  echo "Waiting for PostgreSQL to be ready..."
  until docker exec node-postgres-demo pg_isready -U postgres >/dev/null 2>&1; do
    sleep 1
  done

  echo "'node-postgres-demo' is up and ready!"
fi