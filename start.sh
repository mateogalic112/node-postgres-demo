#!/bin/bash
set -e

# Get the current directory name to use as container name
CONTAINER_NAME=$(basename "$(pwd)")

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
  docker run -d \
    --name ${CONTAINER_NAME} \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_DB=${CONTAINER_NAME} \
    -p 5432:5432 \
    postgres > /dev/null

  echo "Waiting for PostgreSQL to be ready..."
  until docker exec ${CONTAINER_NAME} pg_isready -U postgres >/dev/null 2>&1; do
    sleep 1
  done

  echo "'${CONTAINER_NAME}' is up and ready!"
fi