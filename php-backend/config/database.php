<?php
/**
 * Neighbour Local Services Marketplace
 * Database Configuration File
 *
 * Place this file in your XAMPP htdocs/neighbour/config/ directory
 * Update credentials to match your MySQL setup
 */

// ---- Session (must start before any output) ----
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

header('Content-Type: application/json; charset=utf-8');

// ---- CORS (credentials-aware) ----
// Session cookies require a specific origin, not "*".
$allowedOrigins = [
    'http://localhost:5173',   // Vite dev server
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://localhost',        // built app served from XAMPP
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database credentials — env vars (Docker) with XAMPP-friendly defaults
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');
define('DB_NAME', getenv('DB_NAME') ?: 'neighbour_db');

// PDO Connection
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    // Never leak connection details to the client
    error_log('DB connection failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed. Run setup.php or check config/database.php.']);
    exit;
}

// ---- Lightweight, idempotent migrations ----
// Adds newer columns to existing installs without needing a DB reset.
// Safe to run on every request: each ADD COLUMN is guarded by an
// information_schema existence check (fast on this small DB).
function ensureColumn(PDO $pdo, string $table, string $column, string $definition): void {
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
    ");
    $stmt->execute([$table, $column]);
    if ((int)$stmt->fetchColumn() === 0) {
        // Column name/definition are code constants (never user input).
        $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
    }
}

function runMigrations(PDO $pdo): void {
    try {
        // Government/National ID card number for service providers.
        ensureColumn($pdo, 'users', 'id_card_number', "VARCHAR(50) DEFAULT NULL AFTER phone");
        // Service-provider onboarding approval state.
        // Default 'approved' so existing users keep working; new pros are set to 'pending' explicitly.
        ensureColumn($pdo, 'users', 'approval_status', "ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER is_active");
    } catch (PDOException $e) {
        // Migrations are best-effort; log and continue so the API still serves.
        error_log('Migration warning: ' . $e->getMessage());
    }
}

runMigrations($pdo);

// Helper function to send JSON response
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

// Helper function to validate required fields
function validateFields($data, $required) {
    $missing = [];
    foreach ($required as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            $missing[] = $field;
        }
    }
    if (!empty($missing)) {
        jsonResponse(['error' => 'Missing required fields: ' . implode(', ', $missing)], 400);
    }
}

// ---- Auth helpers ----

/** Returns logged-in user id or null. */
function currentUserId() {
    return $_SESSION['user_id'] ?? null;
}

/** Returns logged-in user role or null. */
function currentUserRole() {
    return $_SESSION['role'] ?? null;
}

/** Aborts with 401 unless logged in. Returns user id. */
function requireLogin() {
    $id = currentUserId();
    if (!$id) {
        jsonResponse(['error' => 'Authentication required'], 401);
    }
    return $id;
}

/** Aborts with 403 unless the user has one of the given roles. */
function requireRole(array $roles) {
    requireLogin();
    if (!in_array(currentUserRole(), $roles, true)) {
        jsonResponse(['error' => 'Insufficient permissions'], 403);
    }
}

/** Returns the professional_profiles.id for the logged-in user, or null. */
function currentProfessionalId($pdo) {
    $uid = currentUserId();
    if (!$uid) return null;
    $stmt = $pdo->prepare("SELECT id FROM professional_profiles WHERE user_id = ?");
    $stmt->execute([$uid]);
    $row = $stmt->fetch();
    return $row ? (int)$row['id'] : null;
}
