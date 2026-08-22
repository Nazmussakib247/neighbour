-- ============================================================
-- Demo service-provider logins
--
-- Gives every seed service provider a name-matched Gmail address and the
-- shared demo password (pro123). Run this on an EXISTING database when you
-- don't want to wipe your data — it keeps all clients, bookings and reviews.
--
-- Docker:
--   docker compose exec -T db mysql -uroot neighbour_db < php-backend/sql/demo-provider-emails.sql
-- XAMPP (from php-backend/):
--   mysql -u root neighbour_db < sql/demo-provider-emails.sql
--
-- (For a completely fresh demo instead, just run `docker compose down -v`
--  then `docker compose up --build` — schema.sql already uses these emails.)
-- ============================================================

USE neighbour_db;

-- password_hash below is bcrypt("pro123"), the same for every provider.
UPDATE users SET email = 'rafiqul.islam@gmail.com', password_hash = '$2b$10$nzUIWXys6NiHRZIIfNVklOzVZT/FAGJLxaxlMYi.XU5mnKZMgiEwS' WHERE email = 'rafiqul@neighbour.com';
UPDATE users SET email = 'shirin.akter@gmail.com',  password_hash = '$2b$10$nzUIWXys6NiHRZIIfNVklOzVZT/FAGJLxaxlMYi.XU5mnKZMgiEwS' WHERE email = 'shirin@neighbour.com';
UPDATE users SET email = 'tania.rahman@gmail.com',  password_hash = '$2b$10$nzUIWXys6NiHRZIIfNVklOzVZT/FAGJLxaxlMYi.XU5mnKZMgiEwS' WHERE email = 'tania@neighbour.com';
UPDATE users SET email = 'jamal.hossain@gmail.com', password_hash = '$2b$10$nzUIWXys6NiHRZIIfNVklOzVZT/FAGJLxaxlMYi.XU5mnKZMgiEwS' WHERE email = 'jamal@neighbour.com';
UPDATE users SET email = 'nusrat.jahan@gmail.com',  password_hash = '$2b$10$nzUIWXys6NiHRZIIfNVklOzVZT/FAGJLxaxlMYi.XU5mnKZMgiEwS' WHERE email = 'nusrat@neighbour.com';
UPDATE users SET email = 'imran.kabir@gmail.com',   password_hash = '$2b$10$nzUIWXys6NiHRZIIfNVklOzVZT/FAGJLxaxlMYi.XU5mnKZMgiEwS' WHERE email = 'imran@neighbour.com';

SELECT full_name, email, role, approval_status FROM users WHERE role = 'professional' ORDER BY id;
