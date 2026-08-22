<?php
/**
 * Services API Endpoint
 * GET  /api/services.php           - List all services
 * GET  /api/services.php?id=1      - Get single service
 * GET  /api/services.php?featured=1 - Get featured services
 * GET  /api/services.php?category=plumbing - Filter by category
 * POST /api/services.php           - Create new service
 * PUT  /api/services.php?id=1      - Update service
 * DELETE /api/services.php?id=1    - Delete service
 */
require_once __DIR__ . '/../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            // Get single service
            $stmt = $pdo->prepare("
                SELECT s.*, c.name as category_name, c.slug as category_slug,
                       p.id as professional_id, p.title as pro_title, p.bio, p.years_experience,
                       p.rating, p.review_count, p.is_top_pro,
                       u.full_name as professional_name, u.avatar, u.location
                FROM services s
                JOIN categories c ON s.category_id = c.id
                JOIN professional_profiles p ON s.professional_id = p.id
                JOIN users u ON p.user_id = u.id
                WHERE s.id = ? AND s.is_active = TRUE
            ");
            $stmt->execute([$_GET['id']]);
            $service = $stmt->fetch();
            
            if (!$service) {
                jsonResponse(['error' => 'Service not found'], 404);
            }
            jsonResponse(['success' => true, 'data' => $service]);
            
        } elseif (isset($_GET['mine'])) {
            // Logged-in professional: list own services (for the pro dashboard)
            requireRole(['professional']);
            $proId = currentProfessionalId($pdo);
            if (!$proId) {
                jsonResponse(['error' => 'No professional profile found for this account'], 403);
            }
            $stmt = $pdo->prepare("
                SELECT s.*, c.name as category_name, c.slug as category_slug
                FROM services s
                JOIN categories c ON s.category_id = c.id
                WHERE s.professional_id = ? AND s.is_active = TRUE
                ORDER BY s.created_at DESC
            ");
            $stmt->execute([$proId]);
            jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);

        } elseif (isset($_GET['featured'])) {
            // Get featured services
            $stmt = $pdo->query("
                SELECT s.*, c.name as category_name,
                       p.id as professional_id, p.rating, p.review_count, p.is_top_pro,
                       u.full_name as professional_name, u.avatar, u.location
                FROM services s
                JOIN categories c ON s.category_id = c.id
                JOIN professional_profiles p ON s.professional_id = p.id
                JOIN users u ON p.user_id = u.id
                WHERE s.is_featured = TRUE AND s.is_active = TRUE
                  AND u.is_active = TRUE AND u.approval_status = 'approved'
                ORDER BY s.created_at DESC
            ");
            jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
            
        } elseif (isset($_GET['category'])) {
            // Filter by category slug
            $stmt = $pdo->prepare("
                SELECT s.*, c.name as category_name,
                       p.id as professional_id, p.rating, p.review_count, p.is_top_pro,
                       u.full_name as professional_name, u.avatar, u.location
                FROM services s
                JOIN categories c ON s.category_id = c.id
                JOIN professional_profiles p ON s.professional_id = p.id
                JOIN users u ON p.user_id = u.id
                WHERE c.slug = ? AND s.is_active = TRUE
                  AND u.is_active = TRUE AND u.approval_status = 'approved'
                ORDER BY s.created_at DESC
            ");
            $stmt->execute([$_GET['category']]);
            jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
            
        } else {
            // List all services with pagination
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = min(50, intval($_GET['limit'] ?? 12));
            $offset = ($page - 1) * $limit;
            
            // Get total count (only approved & active providers' services are public)
            $countStmt = $pdo->query("
                SELECT COUNT(*) FROM services s
                JOIN professional_profiles p ON s.professional_id = p.id
                JOIN users u ON p.user_id = u.id
                WHERE s.is_active = TRUE AND u.is_active = TRUE AND u.approval_status = 'approved'
            ");
            $total = $countStmt->fetchColumn();

            $stmt = $pdo->prepare("
                SELECT s.*, c.name as category_name, c.slug as category_slug,
                       p.id as professional_id, p.rating, p.review_count, p.is_top_pro,
                       u.full_name as professional_name, u.avatar, u.location
                FROM services s
                JOIN categories c ON s.category_id = c.id
                JOIN professional_profiles p ON s.professional_id = p.id
                JOIN users u ON p.user_id = u.id
                WHERE s.is_active = TRUE
                  AND u.is_active = TRUE AND u.approval_status = 'approved'
                ORDER BY s.is_featured DESC, s.created_at DESC
                LIMIT ? OFFSET ?
            ");
            $stmt->execute([$limit, $offset]);
            
            jsonResponse([
                'success' => true,
                'data' => $stmt->fetchAll(),
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'total_pages' => ceil($total / $limit)
                ]
            ]);
        }
        break;
        
    case 'POST':
        // Create new service (professionals create their own; admin can create for anyone)
        requireRole(['professional', 'admin']);
        $data = json_decode(file_get_contents('php://input'), true);
        validateFields($data, ['category_id', 'title', 'price']);

        if (currentUserRole() === 'admin' && !empty($data['professional_id'])) {
            $proId = intval($data['professional_id']);
        } else {
            $proId = currentProfessionalId($pdo);
            if (!$proId) {
                jsonResponse(['error' => 'No professional profile found for this account'], 403);
            }
        }

        $stmt = $pdo->prepare("
            INSERT INTO services (professional_id, category_id, title, description, price, price_unit, image, is_featured)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $proId,
            $data['category_id'],
            $data['title'],
            $data['description'] ?? '',
            $data['price'],
            $data['price_unit'] ?? 'hr',
            $data['image'] ?? null,
            !empty($data['is_featured']) ? 1 : 0
        ]);
        
        jsonResponse(['success' => true, 'message' => 'Service created', 'id' => $pdo->lastInsertId()], 201);
        break;
        
    case 'PUT':
        requireRole(['professional', 'admin']);
        if (!isset($_GET['id'])) {
            jsonResponse(['error' => 'Service ID required'], 400);
        }
        // Professionals may only edit their own services
        if (currentUserRole() !== 'admin') {
            $ownStmt = $pdo->prepare("SELECT id FROM services WHERE id = ? AND professional_id = ?");
            $ownStmt->execute([$_GET['id'], currentProfessionalId($pdo)]);
            if (!$ownStmt->fetch()) {
                jsonResponse(['error' => 'You can only edit your own services'], 403);
            }
        }
        $data = json_decode(file_get_contents('php://input'), true);

        $fields = [];
        $values = [];
        foreach (['title', 'description', 'price', 'price_unit', 'image', 'is_featured', 'is_active'] as $f) {
            if (isset($data[$f])) {
                $fields[] = "$f = ?";
                // Cast booleans to 0/1 — PDO binds PHP false as '' which MySQL strict
                // mode rejects for TINYINT/BOOLEAN columns (Error 1366 -> HTTP 500).
                if ($f === 'is_featured' || $f === 'is_active') {
                    $values[] = !empty($data[$f]) ? 1 : 0;
                } else {
                    $values[] = $data[$f];
                }
            }
        }
        if (empty($fields)) {
            jsonResponse(['error' => 'No fields to update'], 400);
        }
        $values[] = $_GET['id'];
        
        $stmt = $pdo->prepare("UPDATE services SET " . implode(', ', $fields) . " WHERE id = ?");
        $stmt->execute($values);
        
        jsonResponse(['success' => true, 'message' => 'Service updated']);
        break;
        
    case 'DELETE':
        requireRole(['professional', 'admin']);
        if (!isset($_GET['id'])) {
            jsonResponse(['error' => 'Service ID required'], 400);
        }
        if (currentUserRole() !== 'admin') {
            $ownStmt = $pdo->prepare("SELECT id FROM services WHERE id = ? AND professional_id = ?");
            $ownStmt->execute([$_GET['id'], currentProfessionalId($pdo)]);
            if (!$ownStmt->fetch()) {
                jsonResponse(['error' => 'You can only delete your own services'], 403);
            }
        }
        $stmt = $pdo->prepare("UPDATE services SET is_active = FALSE WHERE id = ?");
        $stmt->execute([$_GET['id']]);
        jsonResponse(['success' => true, 'message' => 'Service deleted']);
        break;
        
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
