<?php
/**
 * Image Upload API Endpoint (auth required)
 * POST /api/upload.php  (multipart/form-data)
 *   file    - the image (jpg/png/webp, max 2MB)
 *   purpose - "avatar" (also saves to the user's profile) or "service" (returns URL only)
 *
 * Returns: { success, url }
 */
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$userId = requireLogin();

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    jsonResponse(['error' => 'No file uploaded or upload failed'], 400);
}

$file = $_FILES['file'];

// Max 2MB
if ($file['size'] > 2 * 1024 * 1024) {
    jsonResponse(['error' => 'Image must be 2MB or smaller'], 400);
}

// Must be a real image of an allowed type
$info = @getimagesize($file['tmp_name']);
$allowed = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'];
if (!$info || !isset($allowed[$info[2]])) {
    jsonResponse(['error' => 'Only JPG, PNG, or WebP images are allowed'], 400);
}
$ext = $allowed[$info[2]];

// Save with a random name under /uploads
$uploadDir = __DIR__ . '/../uploads';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}
$name = bin2hex(random_bytes(12)) . '.' . $ext;
if (!move_uploaded_file($file['tmp_name'], "$uploadDir/$name")) {
    jsonResponse(['error' => 'Failed to save the file'], 500);
}

// Public URL (served by Apache): <scheme>://<host><basePath>/uploads/<name>
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$basePath = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/'); // strips "/api/upload.php"
$url = $scheme . '://' . $_SERVER['HTTP_HOST'] . $basePath . '/uploads/' . $name;

// For avatars, persist on the user right away
$purpose = $_POST['purpose'] ?? 'service';
if ($purpose === 'avatar') {
    $stmt = $pdo->prepare("UPDATE users SET avatar = ? WHERE id = ?");
    $stmt->execute([$url, $userId]);
}

jsonResponse(['success' => true, 'url' => $url], 201);
