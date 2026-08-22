<?php
/**
 * Availability API Endpoint (professional only)
 * GET  /api/availability.php   - Get the logged-in provider's weekly schedule
 * POST /api/availability.php   - Replace the logged-in provider's weekly schedule
 *
 * Body for POST:
 * {
 *   "days": [
 *     { "day_of_week": 0-6, "is_available": true, "start_time": "09:00", "end_time": "17:00" },
 *     ...
 *   ]
 * }
 * day_of_week: 0 = Sunday … 6 = Saturday (matches PHP date('w') used by bookings).
 */
require_once __DIR__ . '/../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
requireRole(['professional']);

$proId = currentProfessionalId($pdo);
if (!$proId) {
    jsonResponse(['error' => 'No professional profile found for this account'], 403);
}

/** Normalise "HH:MM" or "HH:MM:SS" to "HH:MM:SS"; returns null if invalid. */
function normaliseTime($t): ?string {
    if (!is_string($t)) return null;
    if (preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $t)) return $t . ':00';
    if (preg_match('/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/', $t)) return $t;
    return null;
}

switch ($method) {
    case 'GET':
        $stmt = $pdo->prepare("
            SELECT day_of_week, start_time, end_time, is_available
            FROM availability
            WHERE professional_id = ?
            ORDER BY day_of_week
        ");
        $stmt->execute([$proId]);
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'POST':
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['days']) || !is_array($data['days'])) {
            jsonResponse(['error' => 'Expected a "days" array'], 400);
        }

        // Validate + normalise all rows before touching the database.
        $rows = [];
        foreach ($data['days'] as $d) {
            if (!isset($d['day_of_week'])) continue;
            $dow = intval($d['day_of_week']);
            if ($dow < 0 || $dow > 6) {
                jsonResponse(['error' => 'day_of_week must be between 0 and 6'], 400);
            }
            $isAvailable = !empty($d['is_available']);
            $start = normaliseTime($d['start_time'] ?? '09:00');
            $end   = normaliseTime($d['end_time'] ?? '17:00');
            if (!$start || !$end) {
                jsonResponse(['error' => 'Invalid time format (expected HH:MM) for day ' . $dow], 400);
            }
            if ($isAvailable && $start >= $end) {
                jsonResponse(['error' => 'Start time must be before end time for day ' . $dow], 400);
            }
            // Keep the latest entry per day if duplicates are sent.
            $rows[$dow] = [$dow, $start, $end, $isAvailable ? 1 : 0];
        }

        // Replace the whole schedule atomically.
        $pdo->beginTransaction();
        try {
            $del = $pdo->prepare("DELETE FROM availability WHERE professional_id = ?");
            $del->execute([$proId]);

            $ins = $pdo->prepare("
                INSERT INTO availability (professional_id, day_of_week, start_time, end_time, is_available)
                VALUES (?, ?, ?, ?, ?)
            ");
            foreach ($rows as $r) {
                $ins->execute([$proId, $r[0], $r[1], $r[2], $r[3]]);
            }
            $pdo->commit();
        } catch (PDOException $e) {
            $pdo->rollBack();
            error_log('Availability save failed: ' . $e->getMessage());
            jsonResponse(['error' => 'Could not save availability'], 500);
        }

        jsonResponse(['success' => true, 'message' => 'Availability updated']);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
