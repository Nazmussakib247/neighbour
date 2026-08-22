<?php
/**
 * Authentication API Endpoint
 * POST /api/auth.php?action=register  - Register new user
 * POST /api/auth.php?action=login     - Login
 * GET  /api/auth.php?action=verify    - Verify token/session
 */
require_once __DIR__ . '/../config/database.php';

// Session is started in config/database.php
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method !== 'POST' && $action !== 'verify') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

switch ($action) {
    case 'register':
        $data = json_decode(file_get_contents('php://input'), true);
        validateFields($data, ['full_name', 'email', 'password']);
        
        // Check if email exists
        $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $checkStmt->execute([$data['email']]);
        if ($checkStmt->fetch()) {
            jsonResponse(['error' => 'Email already registered'], 409);
        }
        
        $passwordHash = password_hash($data['password'], PASSWORD_BCRYPT);
        $role = in_array($data['role'] ?? '', ['client', 'professional']) ? $data['role'] : 'client';
        $isPro = $role === 'professional';

        // Service providers must supply a national ID card number for verification.
        $idCard = isset($data['id_card_number']) ? trim((string)$data['id_card_number']) : '';
        if ($isPro && $idCard === '') {
            jsonResponse(['error' => 'ID card number is required for service providers'], 400);
        }

        // New providers start as 'pending' and must be approved by an admin before
        // they can log in. Clients are 'approved' immediately.
        $approvalStatus = $isPro ? 'pending' : 'approved';

        // Create the user and (for providers) their profile atomically — either
        // both rows are written or neither is, so we never leave an orphan user.
        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("
                INSERT INTO users (full_name, email, password_hash, phone, id_card_number, role, location, approval_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['full_name'],
                $data['email'],
                $passwordHash,
                $data['phone'] ?? null,
                $idCard !== '' ? substr($idCard, 0, 50) : null,
                $role,
                $data['location'] ?? null,
                $approvalStatus,
            ]);

            $userId = $pdo->lastInsertId();

            // Every professional gets a profile (needed for services, availability, etc.)
            if ($isPro) {
                $profStmt = $pdo->prepare("
                    INSERT INTO professional_profiles (user_id, title, bio, years_experience)
                    VALUES (?, ?, ?, ?)
                ");
                $profStmt->execute([
                    $userId,
                    !empty($data['title']) ? $data['title'] : 'Professional',
                    $data['bio'] ?? '',
                    $data['years_experience'] ?? 0
                ]);
            }

            $pdo->commit();
        } catch (PDOException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('Registration failed: ' . $e->getMessage());
            jsonResponse(['error' => 'Registration failed, please try again'], 500);
        }

        // Providers are NOT logged in — they wait for admin approval.
        if ($isPro) {
            jsonResponse([
                'success' => true,
                'pending' => true,
                'message' => 'Your provider account has been submitted and is pending admin approval. You can log in once an admin approves it.',
            ], 201);
        }

        // Clients are signed in right away.
        $_SESSION['user_id'] = $userId;
        $_SESSION['role'] = $role;

        jsonResponse([
            'success' => true,
            'message' => 'Registration successful',
            'user' => ['id' => $userId, 'full_name' => $data['full_name'], 'email' => $data['email'], 'role' => $role]
        ], 201);
        break;
        
    case 'login':
        $data = json_decode(file_get_contents('php://input'), true);
        validateFields($data, ['email', 'password']);

        // --- Rate limiting: max 5 failed attempts per email+IP per 15 minutes ---
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS login_attempts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(190) NOT NULL,
                ip VARCHAR(45) NOT NULL,
                attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_email_ip (email, ip, attempted_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $raStmt = $pdo->prepare("
            SELECT COUNT(*) FROM login_attempts
            WHERE email = ? AND ip = ? AND attempted_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
        ");
        $raStmt->execute([$data['email'], $ip]);
        if ((int)$raStmt->fetchColumn() >= 5) {
            jsonResponse(['error' => 'Too many failed attempts. Please try again in 15 minutes.'], 429);
        }

        $stmt = $pdo->prepare("
            SELECT u.*, p.id as profile_id, p.title, p.is_top_pro
            FROM users u
            LEFT JOIN professional_profiles p ON u.id = p.user_id
            WHERE u.email = ?
        ");
        $stmt->execute([$data['email']]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($data['password'], $user['password_hash'])) {
            // Record the failed attempt
            $pdo->prepare("INSERT INTO login_attempts (email, ip) VALUES (?, ?)")
                ->execute([$data['email'], $ip]);
            jsonResponse(['error' => 'Invalid email or password'], 401);
        }

        // Password is correct — now check account standing (only revealed after a valid password).
        $approval = $user['approval_status'] ?? 'approved';
        if ($approval === 'pending') {
            jsonResponse(['error' => 'Your provider account is still pending admin approval. Please try again after it is approved.'], 403);
        }
        if ($approval === 'rejected') {
            jsonResponse(['error' => 'Your provider application was not approved. Please contact support for details.'], 403);
        }
        if (!(int)$user['is_active']) {
            jsonResponse(['error' => 'Your account has been deactivated. Please contact support.'], 403);
        }

        // Success: clear this user's failed attempts
        $pdo->prepare("DELETE FROM login_attempts WHERE email = ? AND ip = ?")
            ->execute([$data['email'], $ip]);

        $_SESSION['user_id'] = $user['id'];
        $_SESSION['role'] = $user['role'];
        
        jsonResponse([
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'id' => $user['id'],
                'full_name' => $user['full_name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'avatar' => $user['avatar'],
                'title' => $user['title'] ?? null,
                'is_top_pro' => $user['is_top_pro'] ?? false
            ]
        ]);
        break;
        
    case 'forgot':
        // Step 1 of password reset: generate a one-time token (valid 30 min).
        // NOTE: without an SMTP server the token is returned in the response
        // (dev_token) so the flow can be demonstrated; in production it would
        // be emailed to the user instead.
        $data = json_decode(file_get_contents('php://input'), true);
        validateFields($data, ['email']);

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS password_resets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token VARCHAR(64) NOT NULL,
                expires_at DATETIME NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_token (token)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");

        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND is_active = TRUE");
        $stmt->execute([$data['email']]);
        $target = $stmt->fetch();

        $response = ['success' => true, 'message' => 'If this email is registered, a reset code has been generated.'];
        if ($target) {
            $token = bin2hex(random_bytes(16));
            $ins = $pdo->prepare("
                INSERT INTO password_resets (user_id, token, expires_at)
                VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))
            ");
            $ins->execute([$target['id'], $token]);
            $response['dev_token'] = $token; // would be emailed in production
        }
        jsonResponse($response);
        break;

    case 'reset':
        // Step 2: exchange a valid token for a new password
        $data = json_decode(file_get_contents('php://input'), true);
        validateFields($data, ['token', 'new_password']);

        if (strlen($data['new_password']) < 6) {
            jsonResponse(['error' => 'Password must be at least 6 characters'], 400);
        }

        $stmt = $pdo->prepare("
            SELECT id, user_id FROM password_resets
            WHERE token = ? AND used = FALSE AND expires_at > NOW()
        ");
        $stmt->execute([$data['token']]);
        $reset = $stmt->fetch();
        if (!$reset) {
            jsonResponse(['error' => 'Invalid or expired reset code'], 400);
        }

        $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?")
            ->execute([password_hash($data['new_password'], PASSWORD_BCRYPT), $reset['user_id']]);
        $pdo->prepare("UPDATE password_resets SET used = TRUE WHERE id = ?")
            ->execute([$reset['id']]);

        jsonResponse(['success' => true, 'message' => 'Password reset — you can now sign in']);
        break;

    case 'update':
        // Self-service account update (any logged-in user)
        $userId = requireLogin();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $set = [];
        $values = [];
        foreach (['full_name', 'phone', 'location'] as $f) {
            if (isset($data[$f]) && $data[$f] !== '') {
                $set[] = "$f = ?";
                $values[] = substr((string)$data[$f], 0, 190);
            }
        }

        // Optional password change (requires current password)
        if (!empty($data['new_password'])) {
            if (strlen($data['new_password']) < 6) {
                jsonResponse(['error' => 'New password must be at least 6 characters'], 400);
            }
            $pwStmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
            $pwStmt->execute([$userId]);
            $row = $pwStmt->fetch();
            if (!$row || !password_verify($data['current_password'] ?? '', $row['password_hash'])) {
                jsonResponse(['error' => 'Current password is incorrect'], 403);
            }
            $set[] = 'password_hash = ?';
            $values[] = password_hash($data['new_password'], PASSWORD_BCRYPT);
        }

        if (!$set) {
            jsonResponse(['error' => 'No fields to update'], 400);
        }
        $values[] = $userId;
        $stmt = $pdo->prepare("UPDATE users SET " . implode(', ', $set) . " WHERE id = ?");
        $stmt->execute($values);

        // Return the fresh user (same shape as verify)
        $stmt = $pdo->prepare("SELECT id, full_name, email, role, avatar, location FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        jsonResponse(['success' => true, 'message' => 'Account updated', 'user' => $stmt->fetch()]);
        break;

    case 'logout':
        session_destroy();
        jsonResponse(['success' => true, 'message' => 'Logged out']);
        break;
        
    case 'verify':
        if (!isset($_SESSION['user_id'])) {
            jsonResponse(['error' => 'Not authenticated'], 401);
        }
        
        $stmt = $pdo->prepare("SELECT id, full_name, email, role, avatar, location FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        
        if (!$user) {
            jsonResponse(['error' => 'User not found'], 404);
        }
        
        jsonResponse(['success' => true, 'user' => $user]);
        break;
        
    default:
        jsonResponse(['error' => 'Unknown action'], 400);
}
