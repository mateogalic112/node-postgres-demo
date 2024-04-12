# Node.js with Postgresql DEMO

## Starting project

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
http://localhost:5000/api/v1/users
```

Step 4 - Get all users

```bash
curl -H 'Content-Type: application/json' \
http://localhost:5000/api/v1/users
```
