INSERT INTO roles (name, description)
VALUES
  ('ADMIN', 'Administrator with full access'),
  ('USER', 'Regular user')
ON CONFLICT (name) DO NOTHING;
