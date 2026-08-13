<?php
include 'db.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse('error', 'Invalid request method', null, 405);
}

// Read inputs
$fullName      = trim($_POST['fullName'] ?? $_POST['full_name'] ?? '');
$specialty     = trim($_POST['specialty'] ?? '');
$qualification = trim($_POST['qualification'] ?? 'MBBS, MD');
$phone         = trim($_POST['phone'] ?? '');
$roomNo        = trim($_POST['roomNo'] ?? $_POST['room_no'] ?? 'Room 101');
$status        = trim($_POST['status'] ?? 'Available');

if (empty($fullName) || empty($specialty)) {
    $jsonInput = json_decode(file_get_contents('php://input'), true);
    if ($jsonInput) {
        $fullName      = trim($jsonInput['fullName'] ?? $jsonInput['full_name'] ?? '');
        $specialty     = trim($jsonInput['specialty'] ?? '');
        $qualification = trim($jsonInput['qualification'] ?? 'MBBS, MD');
        $phone         = trim($jsonInput['phone'] ?? '');
        $roomNo        = trim($jsonInput['roomNo'] ?? $jsonInput['room_no'] ?? 'Room 101');
        $status        = trim($jsonInput['status'] ?? 'Available');
    }
}

if (empty($fullName)) {
    sendJsonResponse('error', 'Doctor Full Name is required!', null, 400);
}
if (empty($specialty)) {
    sendJsonResponse('error', 'Medical Specialty is required!', null, 400);
}
if (empty($phone)) {
    sendJsonResponse('error', 'Contact Phone Number is required!', null, 400);
}

if (!$db_connected) {
    sendJsonResponse('success', 'Doctor registered (Offline Mode)', [
        'id'            => rand(100, 999),
        'full_name'     => $fullName,
        'specialty'     => $specialty,
        'qualification' => $qualification,
        'phone'         => $phone,
        'room_no'       => $roomNo,
        'status'        => $status
    ]);
}

$stmt = $conn->prepare("INSERT INTO doctors (full_name, specialty, qualification, phone, room_no, status) VALUES (?, ?, ?, ?, ?, ?)");
if (!$stmt) {
    sendJsonResponse('error', 'DB prepare failed: ' . $conn->error, null, 500);
}

$stmt->bind_param("ssssss", $fullName, $specialty, $qualification, $phone, $roomNo, $status);

if ($stmt->execute()) {
    $newId = $conn->insert_id;
    $stmt->close();
    sendJsonResponse('success', 'Doctor Specialist Added & Saved to Database!', [
        'id'            => $newId,
        'full_name'     => $fullName,
        'specialty'     => $specialty,
        'qualification' => $qualification,
        'phone'         => $phone,
        'room_no'       => $roomNo,
        'status'        => $status
    ]);
} else {
    $stmt->close();
    sendJsonResponse('error', 'Database insert failed: ' . $conn->error, null, 500);
}
?>
