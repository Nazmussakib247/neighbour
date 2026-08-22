<?php
/**
 * Categories API Endpoint
 * GET /api/categories.php - List all categories with service counts
 */
require_once __DIR__ . '/../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$stmt = $pdo->query("
    SELECT c.*, COUNT(s.id) as service_count
    FROM categories c
    LEFT JOIN services s ON c.id = s.category_id AND s.is_active = TRUE
    WHERE c.is_active = TRUE
    GROUP BY c.id
    ORDER BY c.display_order ASC
");

jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
