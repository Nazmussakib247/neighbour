<?php
/**
 * Favorites API Endpoint (auth required)
 * GET    /api/favorites.php                          - List current user's favorite professional IDs
 * POST   /api/favorites.php  {professional_id}       - Save a professional to favorites
 * DELETE /api/favorites.php?professional_id=1         - Remove a professional from favorites
 */
require_once __DIR__ . '/../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$userId = requireLogin();

// Self-heal: make sure the table exists (it's also in schema.sql).
$pdo->exec("
    CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        professional_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_favorite (user_id, professional_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

switch ($method) {
    case 'GET':
        // ?detailed=1 → full provider cards for the "My Favourites" page
        if (isset($_GET['detailed'])) {
            $stmt = $pdo->prepare("
                SELECT p.*, u.full_name, u.avatar, u.location,
                       GROUP_CONCAT(DISTINCT pt.tag) as tags,
                       (SELECT MIN(s.price) FROM services s WHERE s.professional_id = p.id AND s.is_active = TRUE) as min_price,
                       (SELECT s2.price_unit FROM services s2 WHERE s2.professional_id = p.id AND s2.is_active = TRUE ORDER BY s2.price ASC LIMIT 1) as min_price_unit
                FROM favorites f
                JOIN professional_profiles p ON f.professional_id = p.id
                JOIN users u ON p.user_id = u.id
                LEFT JOIN professional_tags pt ON p.id = pt.professional_id
                WHERE f.user_id = ?
                GROUP BY p.id
                ORDER BY MAX(f.created_at) DESC
            ");
            $stmt->execute([$userId]);
            jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
        }

        // Default → just the IDs (used to show the saved state on profiles)
        $stmt = $pdo->prepare("SELECT professional_id FROM favorites WHERE user_id = ?");
        $stmt->execute([$userId]);
        $ids = array_map(fn($r) => (int) $r['professional_id'], $stmt->fetchAll());
        jsonResponse(['success' => true, 'data' => $ids]);
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        validateFields($data, ['professional_id']);
        $proId = intval($data['professional_id']);

        $chk = $pdo->prepare("SELECT id FROM professional_profiles WHERE id = ?");
        $chk->execute([$proId]);
        if (!$chk->fetch()) {
            jsonResponse(['error' => 'Professional not found'], 404);
        }

        $stmt = $pdo->prepare("INSERT IGNORE INTO favorites (user_id, professional_id) VALUES (?, ?)");
        $stmt->execute([$userId, $proId]);
        jsonResponse(['success' => true, 'saved' => true, 'message' => 'Saved to favourites']);
        break;

    case 'DELETE':
        $proId = intval($_GET['professional_id'] ?? 0);
        if (!$proId) {
            jsonResponse(['error' => 'professional_id required'], 400);
        }
        $stmt = $pdo->prepare("DELETE FROM favorites WHERE user_id = ? AND professional_id = ?");
        $stmt->execute([$userId, $proId]);
        jsonResponse(['success' => true, 'saved' => false, 'message' => 'Removed from favourites']);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
