-- ============================================================
-- Give each demo provider a distinct profile photo.
-- Run on an EXISTING database (no reset needed, keeps your data):
--   docker compose exec -T db mysql -uroot neighbour_db < php-backend/sql/demo-provider-photos.sql
-- (schema.sql already sets these on a fresh `docker compose down -v && up`.)
--
-- The path is served by the frontend from app/public/images/, so the same
-- photo shows everywhere the person appears (cards, profile, messages, etc.).
-- ============================================================

USE neighbour_db;

UPDATE users SET avatar = '/images/pro-tom.jpg'           WHERE email = 'rafiqul.islam@gmail.com';
UPDATE users SET avatar = '/images/pro-sarah.jpg'         WHERE email = 'shirin.akter@gmail.com';
UPDATE users SET avatar = '/images/pro-nina.jpg'          WHERE email = 'tania.rahman@gmail.com';
UPDATE users SET avatar = '/images/pro-diego.jpg'         WHERE email = 'jamal.hossain@gmail.com';
UPDATE users SET avatar = '/images/pro-aisha.jpg'         WHERE email = 'nusrat.jahan@gmail.com';
UPDATE users SET avatar = '/images/hero-professional.jpg' WHERE email = 'imran.kabir@gmail.com';

SELECT full_name, email, avatar FROM users WHERE role = 'professional' ORDER BY id;
