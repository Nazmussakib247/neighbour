<?php
/**
 * Admin Stats API Endpoint (admin only)
 * GET /api/stats.php - Dashboard statistics
 */
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

requireRole(['admin']);

// Platform commission: the marketplace earns 15% of every paid service.
const COMMISSION_RATE = 0.15;

$totalUsers = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE is_active = TRUE")->fetchColumn();
$activeServices = (int)$pdo->query("SELECT COUNT(*) FROM services WHERE is_active = TRUE")->fetchColumn();
$avgRating = (float)($pdo->query("SELECT ROUND(AVG(rating), 1) FROM professional_profiles WHERE review_count > 0")->fetchColumn() ?: 0);
$pendingProviders = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'professional' AND approval_status = 'pending'")->fetchColumn();

// Gross sales = total value of all paid bookings (what providers delivered).
$grossSales = (float)($pdo->query("SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE payment_status = 'paid'")->fetchColumn());
// Platform revenue = the 15% commission the marketplace keeps.
$revenue = round($grossSales * COMMISSION_RATE, 2);

// Monthly new users, last 12 months
$userGrowth = array_fill(0, 12, 0);
$stmt = $pdo->query("
    SELECT DATE_FORMAT(created_at, '%Y-%m') as ym, COUNT(*) as cnt
    FROM users
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY ym ORDER BY ym
");
$byMonthUsers = [];
foreach ($stmt->fetchAll() as $row) $byMonthUsers[$row['ym']] = (int)$row['cnt'];

// Monthly revenue, last 12 months
$stmt = $pdo->query("
    SELECT DATE_FORMAT(created_at, '%Y-%m') as ym, COALESCE(SUM(total_amount), 0) as amt
    FROM bookings
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY ym ORDER BY ym
");
$byMonthRevenue = [];
foreach ($stmt->fetchAll() as $row) $byMonthRevenue[$row['ym']] = (float)$row['amt'];

$revenueData = array_fill(0, 12, 0);
for ($i = 11; $i >= 0; $i--) {
    $ym = date('Y-m', strtotime("-$i months"));
    $idx = 11 - $i;
    $userGrowth[$idx] = $byMonthUsers[$ym] ?? 0;
    $revenueData[$idx] = $byMonthRevenue[$ym] ?? 0;
}

// Daily revenue, last 7 days (for the "Week" chart tab)
$stmt = $pdo->query("
    SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as ymd, COALESCE(SUM(total_amount), 0) as amt
    FROM bookings
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    GROUP BY ymd ORDER BY ymd
");
$byDayRevenue = [];
foreach ($stmt->fetchAll() as $row) $byDayRevenue[$row['ymd']] = (float)$row['amt'];

$revenueWeek = [];
$revenueWeekLabels = [];
for ($i = 6; $i >= 0; $i--) {
    $ymd = date('Y-m-d', strtotime("-$i days"));
    $revenueWeek[] = $byDayRevenue[$ymd] ?? 0;
    $revenueWeekLabels[] = date('D', strtotime($ymd));
}

// Yearly revenue, last 5 years (for the "Year" chart tab)
$stmt = $pdo->query("
    SELECT YEAR(created_at) as y, COALESCE(SUM(total_amount), 0) as amt
    FROM bookings
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 5 YEAR)
    GROUP BY y ORDER BY y
");
$byYearRevenue = [];
foreach ($stmt->fetchAll() as $row) $byYearRevenue[(int)$row['y']] = (float)$row['amt'];

$revenueYear = [];
$revenueYearLabels = [];
for ($i = 4; $i >= 0; $i--) {
    $y = (int)date('Y') - $i;
    $revenueYear[] = $byYearRevenue[$y] ?? 0;
    $revenueYearLabels[] = (string)$y;
}

// ---- Real month-over-month trends (this month vs last month) ----
$curYm  = date('Y-m');
$prevYm = date('Y-m', strtotime('first day of last month'));

// New services per month (for the services-card trend)
$svcByMonth = [];
foreach ($pdo->query("
    SELECT DATE_FORMAT(created_at, '%Y-%m') as ym, COUNT(*) as cnt
    FROM services WHERE is_active = TRUE GROUP BY ym
")->fetchAll() as $row) {
    $svcByMonth[$row['ym']] = (int)$row['cnt'];
}

/** Percentage change from $prev to $cur, with an up/down flag. */
function trendPct($cur, $prev): array {
    $cur = (float)$cur; $prev = (float)$prev;
    if ($prev <= 0) {
        return ['pct' => $cur > 0 ? 100.0 : 0.0, 'up' => true];
    }
    $delta = round((($cur - $prev) / $prev) * 100, 1);
    return ['pct' => $delta, 'up' => $delta >= 0];
}

$salesThis = $byMonthRevenue[$curYm]  ?? 0;
$salesPrev = $byMonthRevenue[$prevYm] ?? 0;
$trends = [
    'users'    => trendPct($byMonthUsers[$curYm] ?? 0, $byMonthUsers[$prevYm] ?? 0),
    'services' => trendPct($svcByMonth[$curYm] ?? 0, $svcByMonth[$prevYm] ?? 0),
    'sales'    => trendPct($salesThis, $salesPrev),
    // Revenue is a fixed 15% of sales, so it moves with sales.
    'revenue'  => trendPct($salesThis * COMMISSION_RATE, $salesPrev * COMMISSION_RATE),
];

// ---- Sales & commission by individual service ----
$stmt = $pdo->query("
    SELECT s.title AS service, c.name AS category,
           COUNT(b.id) AS bookings,
           COALESCE(SUM(b.total_amount), 0) AS gross
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN categories c ON s.category_id = c.id
    WHERE b.payment_status = 'paid'
    GROUP BY s.id
    ORDER BY gross DESC
");
$salesByService = array_map(function ($r) {
    $gross = (float)$r['gross'];
    return [
        'service'    => $r['service'],
        'category'   => $r['category'],
        'bookings'   => (int)$r['bookings'],
        'gross'      => $gross,
        'commission' => round($gross * COMMISSION_RATE, 2),
    ];
}, $stmt->fetchAll());

// ---- Sales & commission by category ----
$stmt = $pdo->query("
    SELECT c.name,
           COUNT(b.id) AS bookings,
           COALESCE(SUM(b.total_amount), 0) AS gross
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN categories c ON s.category_id = c.id
    WHERE b.payment_status = 'paid'
    GROUP BY c.id
    ORDER BY gross DESC
");
$salesByCategory = array_map(function ($r) {
    $gross = (float)$r['gross'];
    return [
        'name'       => $r['name'],
        'bookings'   => (int)$r['bookings'],
        'gross'      => $gross,
        'commission' => round($gross * COMMISSION_RATE, 2),
    ];
}, $stmt->fetchAll());

// Category distribution by service count
$stmt = $pdo->query("
    SELECT c.name, COUNT(s.id) as value
    FROM categories c
    LEFT JOIN services s ON s.category_id = c.id AND s.is_active = TRUE
    GROUP BY c.id
    HAVING value > 0
    ORDER BY value DESC
    LIMIT 7
");
$categoryDistribution = $stmt->fetchAll();

// Recent bookings
$stmt = $pdo->query("
    SELECT b.id, uc.full_name as customer, s.title as service,
           up.full_name as professional, b.booking_date as date,
           b.total_amount as amount, b.status
    FROM bookings b
    JOIN users uc ON b.client_id = uc.id
    JOIN services s ON b.service_id = s.id
    JOIN professional_profiles p ON b.professional_id = p.id
    JOIN users up ON p.user_id = up.id
    ORDER BY b.created_at DESC
    LIMIT 7
");
$recentBookings = $stmt->fetchAll();

jsonResponse([
    'success' => true,
    'data' => [
        'totalUsers' => $totalUsers,
        'activeServices' => $activeServices,
        'avgRating' => $avgRating,
        'pendingProviders' => $pendingProviders,
        'grossSales' => $grossSales,
        'revenue' => $revenue,
        'commissionRate' => COMMISSION_RATE,
        'trends' => $trends,
        'salesByService' => $salesByService,
        'salesByCategory' => $salesByCategory,
        'userGrowth' => $userGrowth,
        'revenueData' => $revenueData,
        'revenueWeek' => $revenueWeek,
        'revenueWeekLabels' => $revenueWeekLabels,
        'revenueYear' => $revenueYear,
        'revenueYearLabels' => $revenueYearLabels,
        'categoryDistribution' => $categoryDistribution,
        'recentBookings' => $recentBookings,
    ]
]);
