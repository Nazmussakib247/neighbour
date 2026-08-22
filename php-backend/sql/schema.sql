-- ============================================================
-- Neighbour Local Services Marketplace - Database Schema
-- 
-- Import this file into phpMyAdmin or run via MySQL CLI:
-- mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS neighbour_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE neighbour_db;

-- Users table (clients & professionals)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    id_card_number VARCHAR(50) DEFAULT NULL,
    avatar VARCHAR(255),
    role ENUM('client', 'professional', 'admin') DEFAULT 'client',
    location VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_location (location)
) ENGINE=InnoDB;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    icon VARCHAR(50) DEFAULT 'Wrench',
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Professional profiles
CREATE TABLE IF NOT EXISTS professional_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    bio TEXT,
    years_experience INT DEFAULT 0,
    credentials TEXT,
    service_radius INT DEFAULT 15,
    is_top_pro BOOLEAN DEFAULT FALSE,
    response_time_minutes INT DEFAULT 60,
    rating DECIMAL(2, 1) DEFAULT 0.0,
    review_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_top_pro (is_top_pro),
    INDEX idx_rating (rating)
) ENGINE=InnoDB;

-- Services offered by professionals
CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    professional_id INT NOT NULL,
    category_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    price_unit ENUM('hr', 'session', 'visit', 'project', 'package') DEFAULT 'hr',
    image VARCHAR(255),
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (professional_id) REFERENCES professional_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_featured (is_featured),
    INDEX idx_category (category_id)
) ENGINE=InnoDB;

-- Bookings / appointments
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    service_id INT NOT NULL,
    professional_id INT NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    notes TEXT,
    status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    total_amount DECIMAL(10, 2),
    payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (professional_id) REFERENCES professional_profiles(id) ON DELETE CASCADE,
    INDEX idx_client (client_id),
    INDEX idx_status (status),
    INDEX idx_date (booking_date)
) ENGINE=InnoDB;

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    client_id INT NOT NULL,
    professional_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    service_tag VARCHAR(50),
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (professional_id) REFERENCES professional_profiles(id) ON DELETE CASCADE,
    INDEX idx_professional (professional_id),
    INDEX idx_rating (rating)
) ENGINE=InnoDB;

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    professional_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (professional_id) REFERENCES professional_profiles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_favorite (user_id, professional_id)
) ENGINE=InnoDB;

-- Messages between clients and professionals
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_conversation (sender_id, receiver_id),
    INDEX idx_unread (is_read)
) ENGINE=InnoDB;

-- Professional tags
CREATE TABLE IF NOT EXISTS professional_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    professional_id INT NOT NULL,
    tag VARCHAR(50) NOT NULL,
    FOREIGN KEY (professional_id) REFERENCES professional_profiles(id) ON DELETE CASCADE,
    INDEX idx_tag (tag)
) ENGINE=InnoDB;

-- Service availability schedule
CREATE TABLE IF NOT EXISTS availability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    professional_id INT NOT NULL,
    day_of_week TINYINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (professional_id) REFERENCES professional_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Insert default categories
INSERT INTO categories (name, slug, icon, description, display_order) VALUES
('Home Cleaning', 'home-cleaning', 'Sparkles', 'Professional home cleaning services', 1),
('Plumbing', 'plumbing', 'Wrench', 'Plumbing repair and installation', 2),
('Electrical', 'electrical', 'Zap', 'Electrical work and repairs', 3),
('Carpentry', 'carpentry', 'Hammer', 'Custom carpentry and woodwork', 4),
('Painting', 'painting', 'Palette', 'Interior and exterior painting', 5),
('Moving', 'moving', 'Truck', 'Local moving and delivery services', 6),
('Gardening', 'gardening', 'Leaf', 'Garden design and maintenance', 7),
('Pet Care', 'pet-care', 'Dog', 'Pet sitting, walking, and grooming', 8),
('Photography', 'photography', 'Camera', 'Professional photography services', 9),
('Tutoring', 'tutoring', 'GraduationCap', 'Private tutoring and lessons', 10),
('Fitness', 'fitness', 'Dumbbell', 'Personal training and fitness', 11),
('Event Planning', 'event-planning', 'Calendar', 'Event coordination and planning', 12),
('Handyman', 'handyman', 'Wrench', 'General repairs and maintenance', 13),
('Web Design', 'web-design', 'Globe', 'Website design and development', 14),
('Massage', 'massage', 'Heart', 'Therapeutic massage services', 15)
ON DUPLICATE KEY UPDATE display_order = VALUES(display_order);

-- Insert sample admin user (password: admin123)
INSERT INTO users (full_name, email, password_hash, phone, role, location, is_verified, is_active) VALUES
('Admin User', 'admin@neighbour.com', '$2b$10$p3FLVU2QEgIAsEHuNkiQhORh9poXiDrznoRVIANNMk4Gwul8BOb5W', '01711-000100', 'admin', 'Khulna, Bangladesh', TRUE, TRUE)
ON DUPLICATE KEY UPDATE email = email;

-- Insert sample professional users (password: pro123)
INSERT INTO users (full_name, email, password_hash, phone, avatar, role, location, is_verified, is_active) VALUES
('Rafiqul Islam', 'rafiqul.islam@gmail.com', '$2b$10$nzUIWXys6NiHRZIIfNVklOzVZT/FAGJLxaxlMYi.XU5mnKZMgiEwS', '01711-000101', '/images/pro-tom.jpg', 'professional', 'Sonadanga, Khulna', TRUE, TRUE),
('Shirin Akter', 'shirin.akter@gmail.com', '$2b$10$nzUIWXys6NiHRZIIfNVklOzVZT/FAGJLxaxlMYi.XU5mnKZMgiEwS', '01711-000102', '/images/pro-sarah.jpg', 'professional', 'Khalishpur, Khulna', TRUE, TRUE),
('Tania Rahman', 'tania.rahman@gmail.com', '$2b$10$nzUIWXys6NiHRZIIfNVklOzVZT/FAGJLxaxlMYi.XU5mnKZMgiEwS', '01711-000103', '/images/pro-nina.jpg', 'professional', 'Shibbari, Khulna', TRUE, TRUE),
('Jamal Hossain', 'jamal.hossain@gmail.com', '$2b$10$nzUIWXys6NiHRZIIfNVklOzVZT/FAGJLxaxlMYi.XU5mnKZMgiEwS', '01711-000104', '/images/pro-diego.jpg', 'professional', 'Daulatpur, Khulna', TRUE, TRUE),
('Nusrat Jahan', 'nusrat.jahan@gmail.com', '$2b$10$nzUIWXys6NiHRZIIfNVklOzVZT/FAGJLxaxlMYi.XU5mnKZMgiEwS', '01711-000105', '/images/pro-aisha.jpg', 'professional', 'Nirala, Khulna', TRUE, TRUE)
ON DUPLICATE KEY UPDATE email = email;

-- Insert professional profiles
INSERT INTO professional_profiles (user_id, title, bio, years_experience, credentials, is_top_pro, response_time_minutes, rating, review_count) VALUES
(2, 'Master Plumber', 'I have been serving the Khulna community for over 12 years. From emergency leaks to full bathroom renovations, I bring expertise and care to every job.', 12, 'Licensed Plumber (Khulna City Corporation), Fully insured, Background checked', TRUE, 10, 4.9, 127),
(3, 'Professional Cleaner', 'With 8 years of experience, I provide meticulous home cleaning services using eco-friendly products.', 8, 'Eco-friendly certified, Background checked, Insured', FALSE, 15, 4.9, 86),
(4, 'Portrait Photographer', 'Capturing authentic moments with a creative eye. Specializing in portraits, headshots, and event photography.', 6, 'BFA Photography, PPA Member, Background checked', FALSE, 30, 4.8, 64),
(5, 'Handyman', 'Your friendly neighborhood handyman. No job is too small! From furniture assembly to TV mounting.', 15, '15+ years experience, Insured, Background checked', FALSE, 20, 4.8, 203),
(6, 'Yoga Instructor', 'Certified yoga instructor offering private and group sessions tailored to your goals.', 10, 'RYT-500 Certified, First Aid Certified, Background checked', FALSE, 25, 4.9, 91);

-- Insert sample services
INSERT INTO services (professional_id, category_id, title, description, price, price_unit, is_featured) VALUES
(1, 2, 'Same-Day Plumbing Repair', 'Emergency plumbing repairs with rapid response time', 500.00, 'hr', TRUE),
(1, 2, 'Pipe Repair & Replacement', 'Leak detection and pipe repair for all plumbing systems', 450.00, 'hr', FALSE),
(1, 2, 'Drain Cleaning Service', 'Professional drain cleaning and unclogging', 400.00, 'hr', FALSE),
(2, 1, 'Deep Home Cleaning', 'Thorough deep cleaning of your entire home', 350.00, 'hr', TRUE),
(2, 1, 'Regular Maintenance Cleaning', 'Weekly or bi-weekly maintenance cleaning', 250.00, 'hr', FALSE),
(3, 9, 'Professional Headshot Session', 'Studio-quality headshots for professionals', 2500.00, 'session', TRUE),
(3, 9, 'Portrait Photography', 'Creative portrait photography with multiple outfit changes', 3500.00, 'session', FALSE),
(4, 13, 'Furniture Assembly & Mounting', 'Expert furniture assembly and TV mounting services', 400.00, 'hr', TRUE),
(4, 13, 'General Home Repairs', 'Minor repairs and fixes around the house', 350.00, 'hr', FALSE),
(5, 11, 'Private Yoga Instruction', 'One-on-one personalized yoga sessions', 1000.00, 'session', TRUE),
(1, 3, 'Electrical Repair & Installation', 'Licensed electrical work for homes and businesses', 450.00, 'hr', FALSE),
(4, 4, 'Custom Carpentry & Woodwork', 'Custom shelving, cabinets, and trim work', 450.00, 'hr', FALSE),
(4, 5, 'Residential Painting', 'Interior and exterior painting with premium materials', 300.00, 'hr', FALSE),
(4, 6, 'Local Moving Service', 'Careful moving service with truck and equipment included', 1200.00, 'hr', FALSE),
(2, 7, 'Garden Design & Maintenance', 'Beautiful garden design and regular maintenance', 300.00, 'hr', FALSE),
(5, 8, 'Dog Walking & Pet Sitting', 'Reliable pet care with photo updates', 250.00, 'visit', FALSE),
(3, 10, 'Math & Science Tutoring', 'Expert tutoring for school, college, and admission students', 400.00, 'hr', FALSE),
(3, 12, 'Event Planning & Coordination', 'Full-service planning for birthdays, holud nights, and small corporate events', 15000.00, 'project', FALSE);

-- Insert sample client (password: client123)
INSERT INTO users (full_name, email, password_hash, phone, role, location, is_verified, is_active) VALUES
('Farhana Yasmin', 'farhana@example.com', '$2b$10$5bNRA/Z34Q4cVUMI8pOkY.thAECRGQKB2MN.FIKWvJJuK/iCEPlXm', '01711-000200', 'client', 'Sonadanga, Khulna', TRUE, TRUE)
ON DUPLICATE KEY UPDATE email = email;

-- Insert sample completed bookings (client id 7 = Farhana)
INSERT INTO bookings (client_id, service_id, professional_id, booking_date, booking_time, notes, status, total_amount, payment_status) VALUES
(7, 1, 1, '2026-05-20', '10:00:00', 'Kitchen sink leaking', 'completed', 1000.00, 'paid'),
(7, 4, 2, '2026-05-22', '14:00:00', '2-bedroom deep clean', 'completed', 1400.00, 'paid'),
(7, 6, 3, '2026-05-25', '11:00:00', 'LinkedIn headshots', 'completed', 2500.00, 'paid');

-- Insert sample reviews
INSERT INTO reviews (booking_id, client_id, professional_id, rating, comment, service_tag) VALUES
(1, 7, 1, 5, 'Rafiqul was incredible! He fixed our leaking pipe in under an hour and was so professional.', 'Pipe Repair'),
(2, 7, 2, 5, 'Shirin left our apartment spotless. Eco-friendly products and great attention to detail.', 'Deep Cleaning'),
(3, 7, 3, 5, 'Tania made the session fun and the headshots came out amazing.', 'Headshots');

-- Notifications (also auto-created by config/notify.php on existing installs)
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message VARCHAR(500) NOT NULL,
    link VARCHAR(200) DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_read (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Login throttling (also auto-created by api/auth.php). Documented here so the
-- schema/ER diagram reflects every table the application uses.
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_ip (email, ip, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Password reset tokens (also auto-created by api/auth.php).
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Default weekly availability for all professionals (Mon-Fri 9:00-17:00)
INSERT INTO availability (professional_id, day_of_week, start_time, end_time, is_available)
SELECT p.id, d.dow, '09:00:00', '17:00:00', TRUE
FROM professional_profiles p
CROSS JOIN (SELECT 1 AS dow UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) d;

-- Insert professional tags
INSERT INTO professional_tags (professional_id, tag) VALUES
(1, 'Pipe Repair'), (1, 'Drain Cleaning'), (1, 'Water Heater Install'), (1, 'Emergency Calls'), (1, 'Bathroom Renovation'),
(2, 'Deep Cleaning'), (2, 'Regular Cleaning'), (2, 'Move-in Cleaning'), (2, 'Eco-friendly'),
(3, 'Headshots'), (3, 'Portraits'), (3, 'Events'), (3, 'Studio'),
(4, 'Furniture Assembly'), (4, 'TV Mounting'), (4, 'Repairs'), (4, 'Installation'),
(5, 'Vinyasa'), (5, 'Hatha'), (5, 'Meditation'), (5, 'Corporate');

-- Sample PENDING service provider (awaiting admin approval; password: pro123)
-- Added last so it does not disturb the fixed IDs used by the seed bookings above.
INSERT INTO users (full_name, email, password_hash, phone, id_card_number, avatar, role, location, is_verified, is_active, approval_status) VALUES
('Imran Kabir', 'imran.kabir@gmail.com', '$2b$10$nzUIWXys6NiHRZIIfNVklOzVZT/FAGJLxaxlMYi.XU5mnKZMgiEwS', '01711-000106', '1990-1122334455', '/images/hero-professional.jpg', 'professional', 'Boyra, Khulna', FALSE, TRUE, 'pending')
ON DUPLICATE KEY UPDATE email = email;

INSERT INTO professional_profiles (user_id, title, bio, years_experience, credentials)
SELECT u.id, 'AC & Refrigeration Technician', 'Specialising in AC servicing, gas refill and fridge repair across Khulna.', 7, 'Trade certificate, 7+ years experience'
FROM users u
WHERE u.email = 'imran.kabir@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM professional_profiles p WHERE p.user_id = u.id);

-- ============================================================
-- Extra demo clients (password: client123) so provider dashboards show
-- bookings from a few different customers.
-- ============================================================
INSERT INTO users (full_name, email, password_hash, phone, role, location, is_verified, is_active) VALUES
('Karim Ahmed',  'karim.ahmed@gmail.com',  '$2b$10$5bNRA/Z34Q4cVUMI8pOkY.thAECRGQKB2MN.FIKWvJJuK/iCEPlXm', '01711-000201', 'client', 'Sonadanga, Khulna',   TRUE, TRUE),
('Sadia Islam',  'sadia.islam@gmail.com',  '$2b$10$5bNRA/Z34Q4cVUMI8pOkY.thAECRGQKB2MN.FIKWvJJuK/iCEPlXm', '01711-000202', 'client', 'Khalishpur, Khulna',  TRUE, TRUE),
('Nayeem Hasan', 'nayeem.hasan@gmail.com', '$2b$10$5bNRA/Z34Q4cVUMI8pOkY.thAECRGQKB2MN.FIKWvJJuK/iCEPlXm', '01711-000203', 'client', 'Daulatpur, Khulna',   TRUE, TRUE)
ON DUPLICATE KEY UPDATE email = email;

-- ============================================================
-- Demo bookings for every approved provider (mixed statuses) so each
-- provider dashboard looks populated right after login.
-- client_id is resolved by email so it stays correct regardless of IDs.
-- professional_id: 1=Rafiqul 2=Shirin 3=Tania 4=Jamal 5=Nusrat
-- ============================================================
INSERT INTO bookings (client_id, service_id, professional_id, booking_date, booking_time, notes, status, total_amount, payment_status) VALUES
-- Rafiqul (plumber)
((SELECT id FROM users WHERE email='karim.ahmed@gmail.com'),   2, 1, '2026-07-05', '09:00:00', 'Bathroom pipe leaking',          'pending',     900.00,  'pending'),
((SELECT id FROM users WHERE email='sadia.islam@gmail.com'),   3, 1, '2026-07-08', '11:00:00', 'Kitchen drain blocked',          'confirmed',   800.00,  'pending'),
((SELECT id FROM users WHERE email='nayeem.hasan@gmail.com'),  1, 1, '2026-06-28', '15:00:00', 'Emergency tap repair',           'completed',  1000.00,  'paid'),
((SELECT id FROM users WHERE email='farhana@example.com'),    11, 1, '2026-07-02', '10:00:00', 'New light fitting installation', 'in_progress', 900.00,  'pending'),
-- Shirin (cleaner)
((SELECT id FROM users WHERE email='sadia.islam@gmail.com'),   5, 2, '2026-07-06', '10:00:00', 'Weekly maintenance clean',       'pending',     500.00,  'pending'),
((SELECT id FROM users WHERE email='karim.ahmed@gmail.com'),   4, 2, '2026-07-09', '13:00:00', '3-bedroom deep clean',           'confirmed',  1050.00,  'pending'),
((SELECT id FROM users WHERE email='nayeem.hasan@gmail.com'), 15, 2, '2026-06-30', '09:00:00', 'Front garden tidy-up',           'completed',   900.00,  'paid'),
-- Tania (photographer)
((SELECT id FROM users WHERE email='karim.ahmed@gmail.com'),   7, 3, '2026-07-11', '16:00:00', 'Family portrait session',        'pending',    3500.00,  'pending'),
((SELECT id FROM users WHERE email='sadia.islam@gmail.com'),  17, 3, '2026-07-04', '17:00:00', 'HSC physics tutoring',           'confirmed',   800.00,  'pending'),
((SELECT id FROM users WHERE email='nayeem.hasan@gmail.com'),  6, 3, '2026-06-27', '11:00:00', 'Corporate headshots',            'completed',  2500.00,  'paid'),
-- Jamal (handyman)
((SELECT id FROM users WHERE email='farhana@example.com'),     8, 4, '2026-07-05', '10:00:00', 'Wardrobe assembly + TV mount',   'pending',     800.00,  'pending'),
((SELECT id FROM users WHERE email='karim.ahmed@gmail.com'),   9, 4, '2026-07-07', '14:00:00', 'Fix squeaky doors & shelves',    'confirmed',   700.00,  'pending'),
((SELECT id FROM users WHERE email='sadia.islam@gmail.com'),  13, 4, '2026-06-29', '09:00:00', 'Living room repaint',            'completed',  1500.00,  'paid'),
((SELECT id FROM users WHERE email='nayeem.hasan@gmail.com'), 14, 4, '2026-06-25', '08:00:00', 'Flat move to Nirala',            'completed',  1200.00,  'paid'),
((SELECT id FROM users WHERE email='karim.ahmed@gmail.com'),  12, 4, '2026-07-01', '10:00:00', 'Custom bookshelf build',         'in_progress', 900.00,  'pending'),
-- Nusrat (yoga / pet care)
((SELECT id FROM users WHERE email='sadia.islam@gmail.com'),  10, 5, '2026-07-06', '07:00:00', 'Morning private yoga',           'pending',    1000.00,  'pending'),
((SELECT id FROM users WHERE email='farhana@example.com'),    16, 5, '2026-07-08', '08:00:00', 'Daily dog walking',              'confirmed',   250.00,  'pending'),
((SELECT id FROM users WHERE email='nayeem.hasan@gmail.com'), 10, 5, '2026-06-28', '07:00:00', 'Beginner yoga session',          'completed',  1000.00,  'paid'),
((SELECT id FROM users WHERE email='karim.ahmed@gmail.com'),  16, 5, '2026-06-26', '09:00:00', 'Weekend pet sitting',            'completed',   500.00,  'paid');

-- ============================================================
-- Backdate demo data so the admin charts show a realistic multi-month trend
-- instead of everything clustering in the current month.
-- (created_at defaults to NOW(); these UPDATEs spread it out deterministically.)
-- ============================================================
-- Bookings: created 5–65 days before their scheduled date (always <= booking_date).
UPDATE bookings
SET created_at = DATE_SUB(TIMESTAMP(booking_date, booking_time), INTERVAL (5 + (id * 7) % 60) DAY);
-- Users: spread demo sign-ups across roughly the past 10 months for the growth chart.
UPDATE users
SET created_at = DATE_SUB(NOW(), INTERVAL (30 + id * 24) DAY)
WHERE role IN ('professional', 'client');
