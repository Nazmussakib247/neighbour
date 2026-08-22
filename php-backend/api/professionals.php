<?php
/**
 * Professionals API Endpoint
 * GET /api/professionals.php          - List all professionals
 * GET /api/professionals.php?id=1     - Get single professional with services & reviews
 * GET /api/professionals.php?top=1    - Get top professionals
 * GET /api/professionals.php?search=plumber - Search
 * PUT /api/professionals.php          - Update own profile (professional); admin may pass ?id=
 */
require_once __DIR__ . '/../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'PUT') {
    requireRole(['professional', 'admin']);
    if (currentUserRole() === 'admin' && isset($_GET['id'])) {
        $proId = intval($_GET['id']);
    } else {
        $proId = currentProfessionalId($pdo);
    }
    if (!$proId) {
        jsonResponse(['error' => 'No professional profile found for this account'], 403);
    }

    $data = json_decode(file_get_contents('php://input'), true) ?? [];

    // professional_profiles fields
    $fields = [];
    $values = [];
    foreach (['title', 'bio'] as $f) {
        if (isset($data[$f])) {
            $fields[] = "$f = ?";
            $values[] = substr((string)$data[$f], 0, $f === 'bio' ? 3000 : 120);
        }
    }
    if (isset($data['years_experience'])) {
        $fields[] = 'years_experience = ?';
        $values[] = max(0, intval($data['years_experience']));
    }
    if ($fields) {
        $values[] = $proId;
        $stmt = $pdo->prepare("UPDATE professional_profiles SET " . implode(', ', $fields) . " WHERE id = ?");
        $stmt->execute($values);
    }

    // users fields (location / phone / full_name)
    $userSet = [];
    $userValues = [];
    foreach (['location', 'phone', 'full_name'] as $f) {
        if (isset($data[$f])) {
            $userSet[] = "u.$f = ?";
            $userValues[] = substr((string)$data[$f], 0, 190);
        }
    }
    if ($userSet) {
        $stmt = $pdo->prepare("
            UPDATE users u
            JOIN professional_profiles p ON p.user_id = u.id
            SET " . implode(', ', $userSet) . "
            WHERE p.id = ?
        ");
        $userValues[] = $proId;
        $stmt->execute($userValues);
    }

    if (!$fields && !$userSet) {
        jsonResponse(['error' => 'No fields to update'], 400);
    }
    jsonResponse(['success' => true, 'message' => 'Profile updated']);
}

if ($method !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

if (isset($_GET['me'])) {
    // Logged-in professional's own profile (reuses the ?id= branch below)
    requireRole(['professional']);
    $meId = currentProfessionalId($pdo);
    if (!$meId) {
        jsonResponse(['error' => 'No professional profile found for this account'], 403);
    }
    $_GET['id'] = $meId;
}

if (isset($_GET['id'])) {
    // Get single professional with full details
    $stmt = $pdo->prepare("
        SELECT p.*, u.full_name, u.email, u.phone, u.avatar, u.location,
               GROUP_CONCAT(DISTINCT pt.tag) as tags
        FROM professional_profiles p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN professional_tags pt ON p.id = pt.professional_id
        WHERE p.id = ?
        GROUP BY p.id
    ");
    $stmt->execute([$_GET['id']]);
    $pro = $stmt->fetch();
    
    if (!$pro) {
        jsonResponse(['error' => 'Professional not found'], 404);
    }
    
    // Get their services
    $svcStmt = $pdo->prepare("
        SELECT s.*, c.name as category_name, c.slug as category_slug
        FROM services s
        JOIN categories c ON s.category_id = c.id
        WHERE s.professional_id = ? AND s.is_active = TRUE
        ORDER BY s.is_featured DESC
    ");
    $svcStmt->execute([$_GET['id']]);
    $pro['services'] = $svcStmt->fetchAll();
    
    // Get reviews
    $revStmt = $pdo->prepare("
        SELECT r.*, u.full_name as reviewer_name, b.booking_date
        FROM reviews r
        JOIN users u ON r.client_id = u.id
        JOIN bookings b ON r.booking_id = b.id
        WHERE r.professional_id = ? AND r.is_visible = TRUE
        ORDER BY r.created_at DESC
        LIMIT 20
    ");
    $revStmt->execute([$_GET['id']]);
    $pro['reviews'] = $revStmt->fetchAll();
    
    // Get availability
    $availStmt = $pdo->prepare("
        SELECT * FROM availability WHERE professional_id = ? AND is_available = TRUE
    ");
    $availStmt->execute([$_GET['id']]);
    $pro['availability'] = $availStmt->fetchAll();
    
    jsonResponse(['success' => true, 'data' => $pro]);
    
} elseif (isset($_GET['top'])) {
    // Only publicly show approved & active providers.
    $stmt = $pdo->query("
        SELECT p.*, u.full_name, u.avatar, u.location,
               GROUP_CONCAT(DISTINCT pt.tag) as tags,
               (SELECT MIN(s.price) FROM services s WHERE s.professional_id = p.id AND s.is_active = TRUE) as min_price,
               (SELECT s2.price_unit FROM services s2 WHERE s2.professional_id = p.id AND s2.is_active = TRUE ORDER BY s2.price ASC LIMIT 1) as min_price_unit
        FROM professional_profiles p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN professional_tags pt ON p.id = pt.professional_id
        WHERE p.is_top_pro = TRUE AND u.is_active = TRUE AND u.approval_status = 'approved'
        GROUP BY p.id
        ORDER BY p.rating DESC
        LIMIT 10
    ");
    jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);

} elseif (isset($_GET['search'])) {
    $search = '%' . $_GET['search'] . '%';
    $stmt = $pdo->prepare("
        SELECT p.*, u.full_name, u.avatar, u.location,
               GROUP_CONCAT(DISTINCT pt.tag) as tags,
               (SELECT MIN(s.price) FROM services s WHERE s.professional_id = p.id AND s.is_active = TRUE) as min_price,
               (SELECT s2.price_unit FROM services s2 WHERE s2.professional_id = p.id AND s2.is_active = TRUE ORDER BY s2.price ASC LIMIT 1) as min_price_unit
        FROM professional_profiles p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN professional_tags pt ON p.id = pt.professional_id
        WHERE (u.full_name LIKE ? OR p.title LIKE ? OR p.bio LIKE ?)
          AND u.is_active = TRUE AND u.approval_status = 'approved'
        GROUP BY p.id
        ORDER BY p.rating DESC
    ");
    $stmt->execute([$search, $search, $search]);
    jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);

} else {
    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = min(50, intval($_GET['limit'] ?? 20));
    $offset = ($page - 1) * $limit;

    $countStmt = $pdo->query("
        SELECT COUNT(*) FROM professional_profiles p
        JOIN users u ON p.user_id = u.id
        WHERE u.is_active = TRUE AND u.approval_status = 'approved'
    ");
    $total = $countStmt->fetchColumn();

    // Directory listing — approved & active providers, with a starting price.
    $stmt = $pdo->prepare("
        SELECT p.*, u.full_name, u.avatar, u.location,
               GROUP_CONCAT(DISTINCT pt.tag) as tags,
               (SELECT MIN(s.price) FROM services s WHERE s.professional_id = p.id AND s.is_active = TRUE) as min_price,
               (SELECT s2.price_unit FROM services s2 WHERE s2.professional_id = p.id AND s2.is_active = TRUE ORDER BY s2.price ASC LIMIT 1) as min_price_unit
        FROM professional_profiles p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN professional_tags pt ON p.id = pt.professional_id
        WHERE u.is_active = TRUE AND u.approval_status = 'approved'
        GROUP BY p.id
        ORDER BY p.is_top_pro DESC, p.rating DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([$limit, $offset]);

    jsonResponse([
        'success' => true,
        'data' => $stmt->fetchAll(),
        'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total, 'total_pages' => ceil($total / $limit)]
    ]);
}
