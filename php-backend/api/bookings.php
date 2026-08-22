<?php
/**
 * Bookings API Endpoint (auth required)
 * GET  /api/bookings.php              - List own bookings (admin: all)
 * POST /api/bookings.php              - Create booking (client_id from session)
 * PUT  /api/bookings.php?id=1&status=confirmed - Update booking status
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/notify.php';

$method = $_SERVER['REQUEST_METHOD'];

const ALLOWED_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
const ALLOWED_PAYMENT_STATUSES = ['pending', 'paid', 'refunded'];

switch ($method) {
    case 'GET':
        // Public: availability + booked slots for a professional on a date
        // GET /api/bookings.php?slots=1&professional_id=1&date=2026-07-05
        if (isset($_GET['slots'], $_GET['professional_id'], $_GET['date'])) {
            $proId = intval($_GET['professional_id']);
            $date = $_GET['date'];
            $d = DateTime::createFromFormat('Y-m-d', $date);
            if (!$d || $d->format('Y-m-d') !== $date) {
                jsonResponse(['error' => 'Invalid date (expected YYYY-MM-DD)'], 400);
            }
            $dow = (int)$d->format('w'); // 0=Sun … 6=Sat

            $aStmt = $pdo->prepare("
                SELECT start_time, end_time FROM availability
                WHERE professional_id = ? AND day_of_week = ? AND is_available = TRUE
                LIMIT 1
            ");
            $aStmt->execute([$proId, $dow]);
            $window = $aStmt->fetch();

            $bStmt = $pdo->prepare("
                SELECT booking_time FROM bookings
                WHERE professional_id = ? AND booking_date = ?
                  AND status IN ('pending', 'confirmed', 'in_progress')
            ");
            $bStmt->execute([$proId, $date]);
            $booked = array_map(fn($r) => substr($r['booking_time'], 0, 5), $bStmt->fetchAll());

            jsonResponse(['success' => true, 'data' => [
                'available' => (bool)$window,
                'start' => $window ? substr($window['start_time'], 0, 5) : null,
                'end' => $window ? substr($window['end_time'], 0, 5) : null,
                'booked' => $booked,
            ]]);
        }

        $userId = requireLogin();
        $role = currentUserRole();

        if ($role === 'admin') {
            // Admin: list all bookings, paginated
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = min(50, intval($_GET['limit'] ?? 10));
            $offset = ($page - 1) * $limit;

            $stmt = $pdo->prepare("
                SELECT b.*, s.title as service_title,
                       uc.full_name as client_name,
                       up.full_name as professional_name
                FROM bookings b
                JOIN services s ON b.service_id = s.id
                JOIN users uc ON b.client_id = uc.id
                JOIN professional_profiles p ON b.professional_id = p.id
                JOIN users up ON p.user_id = up.id
                ORDER BY b.created_at DESC
                LIMIT ? OFFSET ?
            ");
            $stmt->execute([$limit, $offset]);
            jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
        }

        if ($role === 'professional') {
            // Professional: bookings assigned to them
            $proId = currentProfessionalId($pdo);
            $stmt = $pdo->prepare("
                SELECT b.*, s.title as service_title,
                       uc.full_name as client_name,
                       c.name as category_name
                FROM bookings b
                JOIN services s ON b.service_id = s.id
                JOIN users uc ON b.client_id = uc.id
                JOIN categories c ON s.category_id = c.id
                WHERE b.professional_id = ?
                ORDER BY b.created_at DESC
            ");
            $stmt->execute([$proId]);
            jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
        }

        // Client: only their own bookings (ignores any user_id param)
        $stmt = $pdo->prepare("
            SELECT b.*, s.title as service_title,
                   u.full_name as professional_name,
                   c.name as category_name,
                   r.id as review_id
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            JOIN professional_profiles p ON b.professional_id = p.id
            JOIN users u ON p.user_id = u.id
            JOIN categories c ON s.category_id = c.id
            LEFT JOIN reviews r ON r.booking_id = b.id
            WHERE b.client_id = ?
            ORDER BY b.created_at DESC
        ");
        $stmt->execute([$userId]);
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'POST':
        $userId = requireLogin();
        $data = json_decode(file_get_contents('php://input'), true);
        validateFields($data, ['service_id', 'professional_id', 'booking_date', 'booking_time']);

        // Validate date/time formats
        $date = DateTime::createFromFormat('Y-m-d', $data['booking_date']);
        if (!$date || $date->format('Y-m-d') !== $data['booking_date']) {
            jsonResponse(['error' => 'Invalid booking_date (expected YYYY-MM-DD)'], 400);
        }
        if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/', $data['booking_time'])) {
            jsonResponse(['error' => 'Invalid booking_time (expected HH:MM)'], 400);
        }

        // Verify service exists and belongs to the professional
        $svcStmt = $pdo->prepare("SELECT id, price FROM services WHERE id = ? AND professional_id = ? AND is_active = TRUE");
        $svcStmt->execute([$data['service_id'], $data['professional_id']]);
        $service = $svcStmt->fetch();
        if (!$service) {
            jsonResponse(['error' => 'Service not found for this professional'], 404);
        }

        // --- Availability check: professional must work that day & hour ---
        $bookTime = strlen($data['booking_time']) === 5 ? $data['booking_time'] . ':00' : $data['booking_time'];
        $dow = (int)(new DateTime($data['booking_date']))->format('w');
        $aStmt = $pdo->prepare("
            SELECT start_time, end_time FROM availability
            WHERE professional_id = ? AND day_of_week = ? AND is_available = TRUE
            LIMIT 1
        ");
        $aStmt->execute([$data['professional_id'], $dow]);
        $window = $aStmt->fetch();
        if (!$window) {
            jsonResponse(['error' => 'The professional is not available on this day'], 409);
        }
        if ($bookTime < $window['start_time'] || $bookTime >= $window['end_time']) {
            jsonResponse(['error' => 'Selected time is outside the professional\'s working hours ('
                . substr($window['start_time'], 0, 5) . '–' . substr($window['end_time'], 0, 5) . ')'], 409);
        }

        // --- Double-booking check: slot must be free ---
        $conflictStmt = $pdo->prepare("
            SELECT id FROM bookings
            WHERE professional_id = ? AND booking_date = ? AND booking_time = ?
              AND status IN ('pending', 'confirmed', 'in_progress')
        ");
        $conflictStmt->execute([$data['professional_id'], $data['booking_date'], $bookTime]);
        if ($conflictStmt->fetch()) {
            jsonResponse(['error' => 'This time slot is already booked — please pick another one'], 409);
        }

        // client_id always comes from the session, never the payload
        $stmt = $pdo->prepare("
            INSERT INTO bookings (client_id, service_id, professional_id, booking_date, booking_time, notes, total_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $userId,
            $data['service_id'],
            $data['professional_id'],
            $data['booking_date'],
            $data['booking_time'],
            substr($data['notes'] ?? '', 0, 2000),
            $data['total_amount'] ?? $service['price']
        ]);

        $newBookingId = $pdo->lastInsertId();

        // Notify the professional about the new request
        $proUserStmt = $pdo->prepare("
            SELECT p.user_id, s.title FROM professional_profiles p, services s
            WHERE p.id = ? AND s.id = ?
        ");
        $proUserStmt->execute([$data['professional_id'], $data['service_id']]);
        if ($row = $proUserStmt->fetch()) {
            notifyUser($pdo, $row['user_id'],
                'New booking request: "' . $row['title'] . '" on ' . $data['booking_date'] . ' at ' . substr($bookTime, 0, 5),
                '/dashboard');
        }

        jsonResponse(['success' => true, 'message' => 'Booking created', 'id' => $newBookingId], 201);
        break;

    case 'PUT':
        $userId = requireLogin();
        if (!isset($_GET['id'])) {
            jsonResponse(['error' => 'Booking ID required'], 400);
        }
        $bookingId = intval($_GET['id']);

        // Load booking & check permission: admin, the client, or the assigned professional
        $stmt = $pdo->prepare("SELECT * FROM bookings WHERE id = ?");
        $stmt->execute([$bookingId]);
        $booking = $stmt->fetch();
        if (!$booking) {
            jsonResponse(['error' => 'Booking not found'], 404);
        }

        $role = currentUserRole();
        $isOwnerClient = (int)$booking['client_id'] === (int)$userId;
        $isOwnerPro = $role === 'professional' && currentProfessionalId($pdo) === (int)$booking['professional_id'];
        if ($role !== 'admin' && !$isOwnerClient && !$isOwnerPro) {
            jsonResponse(['error' => 'Insufficient permissions'], 403);
        }

        $updates = [];
        $values = [];

        if (isset($_GET['status'])) {
            if (!in_array($_GET['status'], ALLOWED_STATUSES, true)) {
                jsonResponse(['error' => 'Invalid status. Allowed: ' . implode(', ', ALLOWED_STATUSES)], 400);
            }
            // Clients may only cancel their own bookings
            if ($role === 'client' && $_GET['status'] !== 'cancelled') {
                jsonResponse(['error' => 'Clients can only cancel bookings'], 403);
            }
            $updates[] = 'status = ?';
            $values[] = $_GET['status'];
        }
        if (isset($_GET['payment_status'])) {
            if ($role !== 'admin') {
                jsonResponse(['error' => 'Only admin can change payment status'], 403);
            }
            if (!in_array($_GET['payment_status'], ALLOWED_PAYMENT_STATUSES, true)) {
                jsonResponse(['error' => 'Invalid payment_status. Allowed: ' . implode(', ', ALLOWED_PAYMENT_STATUSES)], 400);
            }
            $updates[] = 'payment_status = ?';
            $values[] = $_GET['payment_status'];
        }

        if (empty($updates)) {
            jsonResponse(['error' => 'No updates specified'], 400);
        }
        $values[] = $bookingId;

        $stmt = $pdo->prepare("UPDATE bookings SET " . implode(', ', $updates) . " WHERE id = ?");
        $stmt->execute($values);

        // Notify the other party about the status change
        if (isset($_GET['status'])) {
            $svcStmt = $pdo->prepare("SELECT title FROM services WHERE id = ?");
            $svcStmt->execute([$booking['service_id']]);
            $svcTitle = $svcStmt->fetchColumn() ?: 'Your booking';
            $statusLabel = ucwords(str_replace('_', ' ', $_GET['status']));

            if ($isOwnerClient) {
                // Client cancelled → tell the professional
                $proUserStmt = $pdo->prepare("SELECT user_id FROM professional_profiles WHERE id = ?");
                $proUserStmt->execute([$booking['professional_id']]);
                if ($proUid = $proUserStmt->fetchColumn()) {
                    notifyUser($pdo, $proUid,
                        'Booking "' . $svcTitle . '" on ' . $booking['booking_date'] . ' was cancelled by the client',
                        '/dashboard');
                }
            } else {
                // Professional/admin changed status → tell the client
                notifyUser($pdo, $booking['client_id'],
                    'Your booking "' . $svcTitle . '" (' . $booking['booking_date'] . ') is now: ' . $statusLabel,
                    '/bookings');
            }
        }

        jsonResponse(['success' => true, 'message' => 'Booking updated']);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
