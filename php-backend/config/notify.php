<?php
/**
 * Notification helpers.
 * The table is auto-created on first use, so no DB reset is needed
 * on existing installs (schema.sql also creates it for fresh ones).
 */

function ensureNotificationsTable($pdo) {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            message VARCHAR(500) NOT NULL,
            link VARCHAR(200) DEFAULT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_read (user_id, is_read)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
}

function notifyUser($pdo, $userId, $message, $link = null) {
    ensureNotificationsTable($pdo);
    $stmt = $pdo->prepare("INSERT INTO notifications (user_id, message, link) VALUES (?, ?, ?)");
    $stmt->execute([intval($userId), substr($message, 0, 500), $link]);
}
