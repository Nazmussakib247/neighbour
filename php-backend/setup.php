<?php
/**
 * Neighbour Setup Script
 * Run this once after placing files in XAMPP htdocs to initialize the database
 * Access: http://localhost/neighbour/setup.php
 */
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Neighbour - Setup</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'DM Sans', 'Inter', system-ui, sans-serif;
            background: #FFF5EE;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
        }
        .setup-card {
            background: white;
            border-radius: 24px;
            padding: 48px;
            max-width: 600px;
            width: 100%;
            box-shadow: 0 12px 40px rgba(0,0,0,0.08);
        }
        .logo { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
        .logo span { font-size: 24px; font-weight: 700; color: #1A1A1A; }
        .logo svg { margin-bottom: 4px; }
        h1 { font-size: 28px; font-weight: 700; color: #1A1A1A; margin: 16px 0 8px; }
        p { color: #8B7E74; font-size: 15px; line-height: 1.6; }
        .steps { margin-top: 32px; }
        .step { 
            display: flex; align-items: flex-start; gap: 16px; 
            padding: 16px 0; border-bottom: 1px solid rgba(26,26,26,0.06);
        }
        .step:last-child { border-bottom: none; }
        .step-num {
            width: 32px; height: 32px; border-radius: 50%;
            background: #FF6B35; color: white;
            display: flex; align-items: center; justify-content: center;
            font-weight: 600; font-size: 14px; flex-shrink: 0;
        }
        .step-num.done { background: #22C55E; }
        .step-num.error { background: #EF4444; }
        .step-content h3 { font-size: 16px; font-weight: 600; color: #1A1A1A; }
        .step-content p { font-size: 14px; margin-top: 4px; }
        .btn {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 14px 32px; background: #1A1A1A; color: white;
            border: none; border-radius: 10px; font-size: 14px; font-weight: 500;
            cursor: pointer; margin-top: 24px; text-decoration: none;
            transition: background 0.2s;
        }
        .btn:hover { background: #FF6B35; }
        .success { color: #22C55E; }
        .error { color: #EF4444; }
    </style>
</head>
<body>
    <div class="setup-card">
        <div class="logo">
            <span>neighbour</span>
            <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                <path d="M5 0C2.24 0 0 2.24 0 5c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="#FF6B35"/>
            </svg>
        </div>
        <h1>Setup Wizard</h1>
        <p>This will initialize the Neighbour database and verify your configuration.</p>

        <div class="steps">
            <?php
            $step = 1;
            
            // Step 1: Check MySQL connection
            $dbHost = getenv('DB_HOST') ?: 'localhost';
            $dbUser = getenv('DB_USER') ?: 'root';
            $dbPass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';
            echo '<div class="step">';
            try {
                $pdo = new PDO("mysql:host=$dbHost;charset=utf8mb4", $dbUser, $dbPass);
                echo '<div class="step-num done">✓</div>';
                echo '<div class="step-content"><h3>MySQL Connection</h3><p class="success">Connected successfully to MySQL</p></div>';
            } catch (PDOException $e) {
                echo '<div class="step-num error">✗</div>';
                echo '<div class="step-content"><h3>MySQL Connection</h3><p class="error">Failed: ' . htmlspecialchars($e->getMessage()) . '</p></div>';
            }
            echo '</div>';
            
            // Step 2: Check if database exists
            echo '<div class="step">';
            try {
                $pdo->exec("CREATE DATABASE IF NOT EXISTS neighbour_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                echo '<div class="step-num done">✓</div>';
                echo '<div class="step-content"><h3>Database</h3><p class="success">Database "neighbour_db" created/verified</p></div>';
            } catch (PDOException $e) {
                echo '<div class="step-num error">✗</div>';
                echo '<div class="step-content"><h3>Database</h3><p class="error">Failed: ' . htmlspecialchars($e->getMessage()) . '</p></div>';
            }
            echo '</div>';
            
            // Step 3: Run schema (skipped if data already exists, to avoid duplicate seeds)
            echo '<div class="step">';
            try {
                $pdo->exec("USE neighbour_db");
                $alreadySeeded = false;
                try {
                    $tables = $pdo->query("SHOW TABLES LIKE 'users'")->fetchAll();
                    if (!empty($tables)) {
                        $alreadySeeded = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn() > 0;
                    }
                } catch (PDOException $e) { /* table missing - proceed with schema */ }

                if ($alreadySeeded) {
                    echo '<div class="step-num done">✓</div>';
                    echo '<div class="step-content"><h3>Tables & Seed Data</h3><p class="success">Database already initialized — skipped to avoid duplicate seed data</p></div>';
                } else {
                    $sql = file_get_contents(__DIR__ . '/sql/schema.sql');
                    $pdo->exec($sql);

                    // Set correct demo passwords (schema hash placeholder may not match)
                    $demo = [
                        'admin@neighbour.com' => 'admin123',
                        'rafiqul.islam@gmail.com' => 'pro123',
                        'shirin.akter@gmail.com' => 'pro123',
                        'tania.rahman@gmail.com' => 'pro123',
                        'jamal.hossain@gmail.com' => 'pro123',
                        'nusrat.jahan@gmail.com' => 'pro123',
                        'imran.kabir@gmail.com' => 'pro123',
                        'farhana@example.com' => 'client123',
                        'karim.ahmed@gmail.com' => 'client123',
                        'sadia.islam@gmail.com' => 'client123',
                        'nayeem.hasan@gmail.com' => 'client123',
                    ];
                    $upd = $pdo->prepare("UPDATE users SET password_hash = ? WHERE email = ?");
                    foreach ($demo as $email => $pw) {
                        $upd->execute([password_hash($pw, PASSWORD_BCRYPT), $email]);
                    }

                    echo '<div class="step-num done">✓</div>';
                    echo '<div class="step-content"><h3>Tables & Seed Data</h3><p class="success">All tables created, sample data inserted, demo passwords set</p></div>';
                }
            } catch (PDOException $e) {
                echo '<div class="step-num error">✗</div>';
                echo '<div class="step-content"><h3>Tables & Seed Data</h3><p class="error">' . htmlspecialchars($e->getMessage()) . '</p></div>';
            }
            echo '</div>';
            
            // Step 4: Verify
            echo '<div class="step">';
            try {
                $pdo->exec("USE neighbour_db");
                $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
                $expected = ['users', 'categories', 'professional_profiles', 'services', 'bookings', 'reviews', 'favorites', 'messages', 'professional_tags', 'availability'];
                $missing = array_diff($expected, $tables);
                
                if (empty($missing)) {
                    $userCount = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
                    echo '<div class="step-num done">✓</div>';
                    echo '<div class="step-content"><h3>Verification</h3><p class="success">All ' . count($expected) . ' tables verified. ' . $userCount . ' sample users loaded.</p></div>';
                } else {
                    echo '<div class="step-num error">✗</div>';
                    echo '<div class="step-content"><h3>Verification</h3><p class="error">Missing tables: ' . implode(', ', $missing) . '</p></div>';
                }
            } catch (PDOException $e) {
                echo '<div class="step-num error">✗</div>';
                echo '<div class="step-content"><h3>Verification</h3><p class="error">' . htmlspecialchars($e->getMessage()) . '</p></div>';
            }
            echo '</div>';
            ?>
        </div>

        <a href="/" class="btn">Go to Homepage →</a>
    </div>
</body>
</html>
