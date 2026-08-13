<?php
include 'db.php';
header('Content-Type: application/json; charset=utf-8');

$type = trim($_GET['type'] ?? 'summary');
$date = trim($_GET['date'] ?? date('Y-m-d'));

// Validate date
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    $date = date('Y-m-d');
}



// ── 1. Daily Summary Counts ──────────────────────────────────────────────────
$sumPatients = 0;
$r = $conn->query("SELECT COUNT(*) AS c FROM patients WHERE DATE(created_at) = '$date'");
if ($r && $row = $r->fetch_assoc()) $sumPatients = intval($row['c']);

$sumAppointments = 0;
$r = $conn->query("SELECT COUNT(*) AS c FROM appointments WHERE appointment_date = '$date' AND status != 'Cancelled'");
if ($r && $row = $r->fetch_assoc()) $sumAppointments = intval($row['c']);

$sumRevenue = 0;
$r = $conn->query("SELECT SUM(total_amount) AS t FROM bills WHERE DATE(created_at) = '$date'");
if ($r && $row = $r->fetch_assoc()) $sumRevenue = floatval($row['t'] ?? 0);

$sumBills = 0;
$r = $conn->query("SELECT COUNT(*) AS c FROM bills WHERE DATE(created_at) = '$date'");
if ($r && $row = $r->fetch_assoc()) $sumBills = intval($row['c']);

// ── 2. Daily Patient Registrations ───────────────────────────────────────────
$patients = [];
$r = $conn->query("SELECT id, full_name, age, gender, phone, blood_group, address, created_at FROM patients WHERE DATE(created_at) = '$date' ORDER BY id DESC");
if ($r) {
    while ($row = $r->fetch_assoc()) $patients[] = $row;
}

// ── 3. Daily Appointments ────────────────────────────────────────────────────
$appointments = [];
$r = $conn->query("
    SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.notes,
           a.doctor_name, p.full_name AS patient_name
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    WHERE a.appointment_date = '$date'
    ORDER BY a.appointment_time ASC
");
if ($r) {
    while ($row = $r->fetch_assoc()) $appointments[] = $row;
}

// ── 4. Daily Bills ───────────────────────────────────────────────────────────
$bills = [];
$r = $conn->query("
    SELECT b.id, b.doctor_fee, b.medication_fee, b.lab_fee, b.discount,
           b.total_amount, b.payment_method, b.status, b.created_at,
           p.full_name AS patient_name
    FROM bills b
    LEFT JOIN patients p ON b.patient_id = p.id
    WHERE DATE(b.created_at) = '$date'
    ORDER BY b.id DESC
");
if ($r) {
    while ($row = $r->fetch_assoc()) $bills[] = $row;
}

// ── 5. ALL Bills (no date filter) ────────────────────────────────────────────
$allBills = [];
$r = $conn->query("
    SELECT b.id, b.doctor_fee, b.medication_fee, b.lab_fee, b.discount,
           b.total_amount, b.payment_method, b.status, b.created_at,
           p.full_name AS patient_name
    FROM bills b
    LEFT JOIN patients p ON b.patient_id = p.id
    ORDER BY b.id DESC
    LIMIT 200
");
if ($r) {
    while ($row = $r->fetch_assoc()) $allBills[] = $row;
}

sendJsonResponse('success', 'Report data fetched', [
    'date'         => $date,
    'summary'      => [
        'patients'     => $sumPatients,
        'appointments' => $sumAppointments,
        'revenue'      => $sumRevenue,
        'bills'        => $sumBills
    ],
    'patients'     => $patients,
    'appointments' => $appointments,
    'bills'        => $bills,
    'all_bills'    => $allBills
]);
?>
