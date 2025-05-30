ALTER TABLE products
ADD COLUMN image_url VARCHAR(2048) DEFAULT NULL,
ADD CONSTRAINT image_url_https_only
CHECK (image_url IS NULL OR image_url ~ '^https://');