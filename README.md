# Node.js Web Socket Server Template

### Starting project 🚀

- **Step 1** - Install dependencies

```bash
yarn install
```

- **Step 2** - Run the server in development mode

```bash
yarn dev
```

### Logging 📜

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

### Creating Bids 💰

The `createBid` function in `BidRepository` handles concurrent bidding with production-grade safety mechanisms.

#### Function Signature

```typescript
public async createBid(userId: number, payload: CreateBidPayload): Promise<Bid>
```

#### Core Implementation

**Transaction Safety**: Uses `SERIALIZABLE` isolation level with 10-second timeout protection. All operations within a single database transaction ensure atomic bid placement.

**Retry Logic**: Automatically retries up to 5 times on serialization failures or deadlocks using exponential backoff (100ms base delay: 100ms, 200ms, 400ms, 800ms, 1600ms).

**Idempotency**: Prevents duplicate bids using unique keys: `bid_{userId}_{auctionId}_{amountInCents}`. Database constraints enforce uniqueness at the storage level.

**Validation Rules**:

- Auction must be active (not cancelled, within time bounds)
- Users cannot bid on their own auctions
- Minimum 10% increase over current highest bid or starting price
- All amounts processed in cents for precision

**Concurrency Control**: Uses `FOR UPDATE NOWAIT` locking to prevent blocking. Handles high-frequency bidding scenarios without deadlocks.

#### Error Responses

| Error                        | Code | Trigger                  |
| ---------------------------- | ---- | ------------------------ |
| `NotFoundError`              | 404  | Invalid/inactive auction |
| `BadRequestError`            | 400  | Insufficient bid amount  |
| `PgError` (Serialization)    | 409  | High concurrent activity |
| `PgError` (Unique Violation) | 409  | Duplicate bid detected   |
| `PgError` (System Load)      | 503  | All retries exhausted    |

#### Logging

Comprehensive tracking with idempotency keys for debugging:

```
[MONEY_BID_START] User 123 bidding $1,500.00 on auction 456 [Key: bid_123_456_150000]
[MONEY_BID_SUCCESS] User 123 successfully bid $1,500.00 in 45ms (attempt 1/5)
```

The system prioritizes data consistency and handles edge cases gracefully, making it suitable for real-money auction environments.
