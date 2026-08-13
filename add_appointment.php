<?php
include 'db.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse('error', 'Invalid request method', null, 405);
}

// Read from POST or JSON body
$patientId  = intval($_POST['patientSelect'] ?? $_POST['patient_id'] ?? 0);
$doctorName = trim($_POST['doctorSelect'] ?? $_POST['doctor_name'] ?? '');
$date       = trim($_POST['appointmentDate'] ?? $_POST['appointment_date'] ?? '');
$time       = trim($_POST['appointmentTime'] ?? $_POST['appointment_time'] ?? '');
$notes      = trim($_POST['notes'] ?? '');

if ($patientId === 0 || empty($doctorName) || empty($date) || empty($time)) {
    $jsonInput = json_decode(file_get_contents('php://input'), true);
    if ($jsonInput) {
        $patientId  = intval($jsonInput['patientSelect'] ?? $jsonInput['patient_id'] ?? 0);
        $doctorName = trim($jsonInput['doctorSelect'] ?? $jsonInput['doctor_name'] ?? '');
        $date       = trim($jsonInput['appointmentDate'] ?? $jsonInput['appointment_date'] ?? '');
        $time       = trim($jsonInput['appointmentTime'] ?? $jsonInput['appointment_time'] ?? '');
        $notes      = trim($jsonInput['notes'] ?? '');
    }
}

// Validate
if ($patientId <= 0) {
    sendJsonResponse('error', 'Please select a registered patient!', null, 400);
}
if (empty($doctorName)) {
    sendJsonResponse('error', 'Please select a doctor!', null, 400);
}
if (empty($date)) {
    sendJsonResponse('error', 'Appointment date is required!', null, 400);
}
if (empty($time)) {
    sendJsonResponse('error', 'Appointment time is required!', null, 400);
}
if (!$db_connected) {
    sendJsonResponse('success', 'Appointment Reserved (Offline Mode)', [
        'id'               => rand(200, 999),
        'patient_id'       => $patientId,
        'doctor_name'      => $doctorName,
        'appointment_date' => $date,
        'appointment_time' => $time,
        'notes'            => $notes,
        'status'           => 'Pending'
    ]);
}

$stmt = $conn->prepare("INSERT INTO appointments (patient_id, doctor_name, appointment_date, appointment_time, notes, status) VALUES (?, ?, ?, ?, ?, 'Pending')");
if (!$stmt) {
    sendJsonResponse('error', 'DB prepare failed: ' . $conn->error, null, 500);
}

$stmt->bind_param("issss", $patientId, $doctorName, $date, $time, $notes);

if ($stmt->execute()) {
    $aptId = $conn->insert_id;
    $stmt->close();
    sendJsonResponse('success', 'Appointment Reserved & Saved to Database!', [
        'id'               => $aptId,
        'patient_id'       => $patientId,
        'doctor_name'      => $doctorName,
        'appointment_date' => $date,
        'appointment_time' => $time,
        'notes'            => $notes,
        'status'           => 'Pending'
    ]);
} else {
    $stmt->close();
    sendJsonResponse('error', 'Database insert failed: ' . $conn->error, null, 500);
}
?>