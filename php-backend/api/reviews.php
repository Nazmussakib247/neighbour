<?php
/**
 * Reviews API Endpoint
 * GET  /api/reviews.php?professional_id=1  - List reviews for a professional (public)
 * POST /api/reviews.php                    - Create review (auth, must own a completed booking)
 */
require_once __DIR__ . '/../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (!isset($_GET['professional_id'])) {
            jsonResponse(['error' => 'professional_id required'], 400);
        }
        $limit = min(50, intval($_GET['limit'] ?? 20));
        $offset = max(0, intval($_GET['offset'] ?? 0));

        $stmt = $pdo->prepare("
            SELECT r.id, r.rating, r.comment, r.service_tag, r.created_at,
                   u.full_name as author
            FROM reviews r
            JOIN users u ON r.client_id = u.id
            WHERE r.professional_id = ? AND r.is_visible = TRUE
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute([intval($_GET['professional_id']), $limit, $offset]);
        $reviews = $stmt->fetchAll();

        // Rating distribution (percentage of 5,4,3,2,1 stars)
        $distStmt = $pdo->prepare("
            SELECT rating, COUNT(*) as cnt FROM reviews
            WHERE professional_id = ? AND is_visible = TRUE
            GROUP BY rating
        ");
        $distStmt->execute([intval($_GET['professional_id'])]);
        $counts = array_fill(1, 5, 0);
        $total = 0;
        foreach ($distStmt->fetchAll() as $row) {
            $counts[(int)$row['rating']] = (int)$row['cnt'];
            $total += (int)$row['cnt'];
        }
        $distribution = [];
        for ($star = 5; $star >= 1; $star--) {
            $distribution[] = ['stars' => $star, 'percent' => $total ? round($counts[$star] / $total * 100) : 0];
        }

        jsonResponse(['success' => true, 'data' => $reviews, 'distribution' => $distribution, 'total' => $total]);
        break;

    case 'POST':
        $userId = requireLogin();
        $data = json_decode(file_get_contents('php://input'), true);
        validateFields($data, ['booking_id', 'rating']);

        $rating = intval($data['rating']);
        if ($rating < 1 || $rating > 5) {
            jsonResponse(['error' => 'Rating must be between 1 and 5'], 400);
        }

        // Booking must belong to this user and be completed
        $bStmt = $pdo->prepare("SELECT * FROM bookings WHERE id = ? AND client_id = ?");
        $bStmt->execute([intval($data['booking_id']), $userId]);
        $booking = $bStmt->fetch();
        if (!$booking) {
            jsonResponse(['error' => 'Booking not found or not yours'], 404);
        }
        if ($booking['status'] !== 'completed') {
            jsonResponse(['error' => 'You can only review completed bookings'], 400);
        }

        // One review per booking
        $dupStmt = $pdo->prepare("SELECT id FROM reviews WHERE booking_id = ?");
        $dupStmt->execute([$booking['id']]);
        if ($dupStmt->fetch()) {
            jsonResponse(['error' => 'This booking has already been reviewed'], 409);
        }

        $stmt = $pdo->prepare("
            INSERT INTO reviews (booking_id, client_id, professional_id, rating, comment, service_tag)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $booking['id'],
            $userId,
            $booking['professional_id'],
            $rating,
            substr($data['comment'] ?? '', 0, 2000),
            substr($data['service_tag'] ?? '', 0, 50)
        ]);

        // Recompute professional aggregate rating
        $aggStmt = $pdo->prepare("
            UPDATE professional_profiles p
            SET p.rating = (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE professional_id = p.id AND is_visible = TRUE),
                p.review_count = (SELECT COUNT(*) FROM reviews WHERE professional_id = p.id AND is_visible = TRUE)
            WHERE p.id = ?
        ");
        $aggStmt->execute([$booking['professional_id']]);

        jsonResponse(['success' => true, 'message' => 'Review submitted', 'id' => $pdo->lastInsertId()], 201);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
