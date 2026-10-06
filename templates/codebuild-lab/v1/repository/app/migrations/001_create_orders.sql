CREATE TABLE orders (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku text NOT NULL,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 100),
  unit_price_cents integer NOT NULL CHECK (unit_price_cents > 0),
  total_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
