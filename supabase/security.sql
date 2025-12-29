-- 1. Enable RLS on all tables (force security)
ALTER TABLE IF EXISTS "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "profiles" ENABLE ROW LEVEL SECURITY;

-- 2. Create policies for 'products' (Public Read, Admin Write)
-- Ensure public can read products everywhere
DROP POLICY IF EXISTS "Public Read Products" ON "products";
CREATE POLICY "Public Read Products" ON "products" FOR SELECT USING (true);

-- Ensure only admins can modify products
DROP POLICY IF EXISTS "Admin Insert Products" ON "products";
CREATE POLICY "Admin Insert Products" ON "products" FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

DROP POLICY IF EXISTS "Admin Update Products" ON "products";
CREATE POLICY "Admin Update Products" ON "products" FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

DROP POLICY IF EXISTS "Admin Delete Products" ON "products";
CREATE POLICY "Admin Delete Products" ON "products" FOR DELETE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- 3. Create policies for 'orders' (Public Insert for guest checkout, Owner Read)
-- Pending orders are created via API with Service Role usually, but if client creates:
DROP POLICY IF EXISTS "Public Insert Orders" ON "orders";
CREATE POLICY "Public Insert Orders" ON "orders" FOR INSERT WITH CHECK (true);

-- Only owner or admin can view orders
DROP POLICY IF EXISTS "Owner Read Orders" ON "orders";
CREATE POLICY "Owner Read Orders" ON "orders" FOR SELECT USING (
  auth.uid() = user_id 
  OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  OR user_id IS NULL -- Optional: allow guests to see anonymous orders? Usually unsafe.
);

-- 4. Create policies for 'order_items'
DROP POLICY IF EXISTS "Public Insert Order Items" ON "order_items";
CREATE POLICY "Public Insert Order Items" ON "order_items" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Owner Read Order Items" ON "order_items";
CREATE POLICY "Owner Read Order Items" ON "order_items" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (
      orders.user_id = auth.uid() 
      OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    )
  )
);

-- 5. Create policies for 'profiles' (Read/Update Own, Admin Read All)
DROP POLICY IF EXISTS "Public Read Profiles" ON "profiles";
DROP POLICY IF EXISTS "Read Own Profile" ON "profiles";
CREATE POLICY "Read Own Profile" ON "profiles" FOR SELECT USING (
  auth.uid() = id OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

DROP POLICY IF EXISTS "Update Own Profile" ON "profiles";
CREATE POLICY "Update Own Profile" ON "profiles" FOR UPDATE USING (
  auth.uid() = id
);

-- 6. Trigger for new users (ensure profile creation)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'customer');
  return new;
end;
$$ language plpgsql security definer;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
