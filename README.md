# Node.js with Postgresql DEMO

### Starting project

Step 1 - Install project dependencies

```bash
yarn install
```

Step 2 - Create Postgresql database with Docker command

```bash
docker run -d \
--name node-postgres-demo \
-e POSTGRES_PASSWORD=postgres \
-e POSTGRES_USER=postgres \
-e POSTGRES_DB=node-postgres-demo \
-p 5432:5432 \
postgres
```

Step 3 - Create `Users Table` from terminal

1.  Get in docker container terminal

```bash
docker exec -it {container_identifier} bash
```

2.  Login to Postgres

```bash
psql -h localhost -p 5432 -U postgres
```

3.  Go to `node-postgres-demo`

```bash
\c node-postgres-demo
```

4.  Create users table

```bash
CREATE TABLE users ( \
 id SERIAL PRIMARY KEY, \
 username VARCHAR(80), \
 email VARCHAR(255), \
 created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP \
 );
```

Step 4 - Create entry in `Users table`

```bash
curl -H 'Content-Type: application/json' \
-d '{"username": "mateo", "email": "mateo@gmail.com"}' \
-X POST \
http://localhost:4000/api/v1/users
```

Step 4 - Get all users

```bash
curl -H 'Content-Type: application/json' \
http://localhost:4000/api/v1/users
```

### Logging

The application uses Winston for logging with the following features:

- Logs are written to both console and file (`logs/app.log`)
- Log format includes timestamp, log level, and message
- Logging is disabled during tests
- Request logging middleware automatically logs:
  - Start of each request with method, URL, and body
  - End of each request with status code and duration
  - Error logging for all HTTP errors

#### Log Levels

- `info`: General application information
- `error`: Error messages and stack traces

```
[2024-03-21T10:15:30.123Z] info: [START] POST /api/v1/users: {"username":"mateo","email":"mateo@gmail.com"}
[2024-03-21T10:15:30.234Z] info: [FINISH] POST /api/v1/users: 201 111.00ms
```
