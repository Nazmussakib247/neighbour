<?php
/**
 * Messages API Endpoint (auth required)
 * GET  /api/messages.php               - Inbox: list of conversations (latest message per person)
 * GET  /api/messages.php?with=5        - Full thread with user #5 (marks their messages as read)
 * POST /api/messages.php {receiver_id, content}  - Send a message
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/notify.php';

$method = $_SERVER['REQUEST_METHOD'];
$me = requireLogin();

// Self-heal: ensure the table exists (also defined in schema.sql).
$pdo->exec("
    CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_conversation (sender_id, receiver_id),
        INDEX idx_unread (is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

switch ($method) {
    case 'GET':
        if (isset($_GET['with'])) {
            $other = intval($_GET['with']);

            $uStmt = $pdo->prepare("SELECT id, full_name, avatar, role FROM users WHERE id = ?");
            $uStmt->execute([$other]);
            $otherUser = $uStmt->fetch();
            if (!$otherUser) {
                jsonResponse(['error' => 'User not found'], 404);
            }

            $stmt = $pdo->prepare("
                SELECT id, sender_id, receiver_id, content, is_read, created_at
                FROM messages
                WHERE (sender_id = ? AND receiver_id = ?)
                   OR (sender_id = ? AND receiver_id = ?)
                ORDER BY created_at ASC, id ASC
            ");
            $stmt->execute([$me, $other, $other, $me]);
            $messages = $stmt->fetchAll();

            // Mark their messages to me as read
            $pdo->prepare("UPDATE messages SET is_read = TRUE WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE")
                ->execute([$other, $me]);

            jsonResponse(['success' => true, 'data' => ['user' => $otherUser, 'messages' => $messages]]);
        }

        // Inbox: latest message per conversation partner
        $stmt = $pdo->prepare("
            SELECT other.id AS user_id, other.full_name, other.avatar,
                   lm.content AS last_message, lm.created_at AS last_at,
                   (SELECT COUNT(*) FROM messages m2
                     WHERE m2.sender_id = other.id AND m2.receiver_id = ? AND m2.is_read = FALSE) AS unread
            FROM (
                SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other_id,
                       MAX(id) AS last_id
                FROM messages
                WHERE sender_id = ? OR receiver_id = ?
                GROUP BY other_id
            ) conv
            JOIN users other ON other.id = conv.other_id
            JOIN messages lm ON lm.id = conv.last_id
            ORDER BY lm.created_at DESC
        ");
        $stmt->execute([$me, $me, $me, $me]);
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        validateFields($data, ['receiver_id', 'content']);
        $receiver = intval($data['receiver_id']);
        $content = trim((string) $data['content']);

        if ($receiver === (int) $me) {
            jsonResponse(['error' => 'You cannot message yourself'], 400);
        }
        if ($content === '') {
            jsonResponse(['error' => 'Message cannot be empty'], 400);
        }

        $chk = $pdo->prepare("SELECT full_name FROM users WHERE id = ? AND is_active = TRUE");
        $chk->execute([$receiver]);
        if (!$chk->fetch()) {
            jsonResponse(['error' => 'Recipient not found'], 404);
        }

        $stmt = $pdo->prepare("INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)");
        $stmt->execute([$me, $receiver, substr($content, 0, 2000)]);

        // Notify the recipient
        $senderStmt = $pdo->prepare("SELECT full_name FROM users WHERE id = ?");
        $senderStmt->execute([$me]);
        $senderName = $senderStmt->fetchColumn() ?: 'Someone';
        notifyUser($pdo, $receiver, $senderName . ' sent you a message', '/messages?with=' . $me);

        jsonResponse(['success' => true, 'id' => $pdo->lastInsertId(), 'message' => 'Message sent'], 201);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
