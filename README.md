# Node.js Web Server Template

### Starting project

- **Step 1** - Install dependencies

```bash
yarn install
```

- **Step 2** - Create Postgresql database with Docker

```bash
docker run -d \
--name node-postgres-demo \
-e POSTGRES_PASSWORD=postgres \
-e POSTGRES_USER=postgres \
-e POSTGRES_DB=node-postgres-demo \
-p 5432:5432 \
postgres
```

- **Step 3** - Run migrations

```bash
yarn migrate
```

- **Step 4** - Run the server in development mode

```bash
yarn dev
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
