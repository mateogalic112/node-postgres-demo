import { Bid } from "bids/bids.validation";
import { User } from "users/users.validation";

const now = new Date();

export const mockUser: User = {
  id: 1,
  username: "bidder",
  email: "bidder@example.com",
  role_id: 1,
  password: "hashed_password",
  created_at: now,
  updated_at: now
};

export const mockAuction = {
  id: 10,
  product_id: 1,
  creator_id: 99,
  winner_id: null,
  start_time: now,
  duration_hours: 48,
  starting_price_in_cents: 1000,
  is_cancelled: false,
  created_at: now,
  updated_at: now
};

export const makeBidRow = (overrides?: Partial<Bid>): Bid => ({
  id: 1,
  auction_id: 10,
  user_id: mockUser.id,
  amount_in_cents: 5000,
  idempotency_key: `bid_${mockUser.id}_10_5000`,
  created_at: now,
  updated_at: now,
  ...overrides
});
