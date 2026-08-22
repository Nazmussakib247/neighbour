<?php
/**
 * Users API Endpoint (admin only)
 * GET  /api/users.php                    - List all users (paginated)
 * POST /api/users.php                    - Create a user (client/professional) without touching the session
 * PUT  /api/users.php?id=5&active=0             - Activate / deactivate a user
 * PUT  /api/users.php?id=5&approval=approved    - Approve / reject a pending provider
 */
require_once __DIR__ . '/../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
requireRole(['admin']);

switch ($method) {
    case 'GET':
        $page = max(1, intval($_GET['page'] ?? 1));
        $limit = min(100, intval($_GET['limit'] ?? 50));
        $offset = ($page - 1) * $limit;

        // Pending providers surface first so the admin sees approvals up top.
        $stmt = $pdo->prepare("
            SELECT u.id, u.full_name, u.email, u.phone, u.id_card_number, u.role, u.location,
                   u.is_active, u.approval_status, u.created_at, p.title as pro_title
            FROM users u
            LEFT JOIN professional_profiles p ON p.user_id = u.id
            ORDER BY (u.approval_status = 'pending') DESC, u.created_at DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute([$limit, $offset]);
        jsonResponse(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        validateFields($data, ['full_name', 'email', 'password']);

        $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $checkStmt->execute([$data['email']]);
        if ($checkStmt->fetch()) {
            jsonResponse(['error' => 'Email already registered'], 409);
        }

        $role = in_array($data['role'] ?? '', ['client', 'professional'], true) ? $data['role'] : 'client';
        $passwordHash = password_hash($data['password'], PASSWORD_BCRYPT);
        $idCard = isset($data['id_card_number']) && trim((string)$data['id_card_number']) !== ''
            ? substr(trim((string)$data['id_card_number']), 0, 50) : null;

        // Admin-created accounts are trusted, so they are approved immediately.
        // User + profile are written atomically (transaction) to avoid orphans.
        $professionalId = null;
        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("
                INSERT INTO users (full_name, email, password_hash, phone, id_card_number, role, location, is_verified, is_active, approval_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, TRUE, 'approved')
            ");
            $stmt->execute([
                $data['full_name'],
                $data['email'],
                $passwordHash,
                $data['phone'] ?? null,
                $idCard,
                $role,
                $data['location'] ?? null,
            ]);
            $userId = $pdo->lastInsertId();

            if ($role === 'professional') {
                $profStmt = $pdo->prepare("
                    INSERT INTO professional_profiles (user_id, title, bio, years_experience)
                    VALUES (?, ?, ?, ?)
                ");
                $profStmt->execute([
                    $userId,
                    $data['title'] ?? 'Professional',
                    $data['bio'] ?? '',
                    intval($data['years_experience'] ?? 0),
                ]);
                $professionalId = $pdo->lastInsertId();
            }

            $pdo->commit();
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('Admin user creation failed: ' . $e->getMessage());
            jsonResponse(['error' => 'Could not create user'], 500);
        }

        // NOTE: the admin session is left untouched (unlike auth.php register)
        jsonResponse([
            'success' => true,
            'message' => 'User created',
            'id' => $userId,
            'professional_id' => $professionalId,
        ], 201);
        break;

    case 'PUT':
        if (!isset($_GET['id'])) {
            jsonResponse(['error' => 'User ID required'], 400);
        }
        $targetId = intval($_GET['id']);
        if ($targetId === intval(currentUserId())) {
            jsonResponse(['error' => 'You cannot change your own account status'], 400);
        }

        // --- Approve / reject a pending service provider ---
        if (isset($_GET['approval'])) {
            require_once __DIR__ . '/../config/notify.php';
            $status = $_GET['approval'];
            if (!in_array($status, ['approved', 'rejected', 'pending'], true)) {
                jsonResponse(['error' => 'Invalid approval value (approved, rejected or pending)'], 400);
            }
            // Approving a provider also (re)activates the account.
            if ($status === 'approved') {
                $stmt = $pdo->prepare("UPDATE users SET approval_status = 'approved', is_active = TRUE WHERE id = ?");
                $stmt->execute([$targetId]);
            } else {
                $stmt = $pdo->prepare("UPDATE users SET approval_status = ? WHERE id = ?");
                $stmt->execute([$status, $targetId]);
            }

            $check = $pdo->prepare("SELECT id FROM users WHERE id = ?");
            $check->execute([$targetId]);
            if (!$check->fetch()) {
                jsonResponse(['error' => 'User not found'], 404);
            }

            if ($status === 'approved') {
                notifyUser($pdo, $targetId, 'Your provider account has been approved. Welcome aboard — you can now log in and start receiving bookings!', '/dashboard');
                jsonResponse(['success' => true, 'message' => 'Provider approved']);
            } elseif ($status === 'rejected') {
                notifyUser($pdo, $targetId, 'Your provider application was not approved. Please contact support for more details.', null);
                jsonResponse(['success' => true, 'message' => 'Provider rejected']);
            }
            jsonResponse(['success' => true, 'message' => 'Provider set back to pending']);
        }

        // --- Activate / deactivate a user ---
        if (!isset($_GET['active'])) {
            jsonResponse(['error' => 'active or approval parameter required'], 400);
        }
        $active = intval($_GET['active']) === 1 ? 1 : 0;

        $stmt = $pdo->prepare("UPDATE users SET is_active = ? WHERE id = ?");
        $stmt->execute([$active, $targetId]);
        if ($stmt->rowCount() === 0) {
            // id may not exist (or value unchanged) — verify existence
            $check = $pdo->prepare("SELECT id FROM users WHERE id = ?");
            $check->execute([$targetId]);
            if (!$check->fetch()) {
                jsonResponse(['error' => 'User not found'], 404);
            }
        }
        jsonResponse(['success' => true, 'message' => $active ? 'User activated' : 'User deactivated']);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
