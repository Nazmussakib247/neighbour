<?php
/**
 * Notifications API Endpoint (auth required)
 * GET /api/notifications.php            - Own latest notifications + unread count
 * PUT /api/notifications.php?all=1      - Mark all own notifications as read
 * PUT /api/notifications.php?id=5       - Mark one notification as read
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/notify.php';

$method = $_SERVER['REQUEST_METHOD'];
$userId = requireLogin();
ensureNotificationsTable($pdo);

switch ($method) {
    case 'GET':
        $stmt = $pdo->prepare("
            SELECT id, message, link, is_read, created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 20
        ");
        $stmt->execute([$userId]);
        $items = $stmt->fetchAll();

        $cStmt = $pdo->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = FALSE");
        $cStmt->execute([$userId]);
        $unread = (int)$cStmt->fetchColumn();

        jsonResponse(['success' => true, 'data' => ['items' => $items, 'unread' => $unread]]);
        break;

    case 'PUT':
        if (isset($_GET['all'])) {
            $stmt = $pdo->prepare("UPDATE notifications SET is_read = TRUE WHERE user_id = ?");
            $stmt->execute([$userId]);
        } elseif (isset($_GET['id'])) {
            $stmt = $pdo->prepare("UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?");
            $stmt->execute([intval($_GET['id']), $userId]);
        } else {
            jsonResponse(['error' => 'id or all parameter required'], 400);
        }
        jsonResponse(['success' => true, 'message' => 'Marked as read']);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
