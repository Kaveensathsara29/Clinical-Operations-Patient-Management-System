<?php
include 'db.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse('error', 'Invalid request method', null, 405);
}

$id     = intval($_POST['id'] ?? 0);
$status = trim($_POST['status'] ?? '');

if ($id <= 0 || empty($status)) {
    $jsonInput = json_decode(file_get_contents('php://input'), true);
    if ($jsonInput) {
        $id     = intval($jsonInput['id'] ?? 0);
        $status = trim($jsonInput['status'] ?? '');
    }
}

if ($id <= 0) {
    sendJsonResponse('error', 'Valid Appointment ID is required', null, 400);
}
if (empty($status)) {
    sendJsonResponse('error', 'New status is required', null, 400);
}

// Validate status value
$allowedStatuses = ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'];
if (!in_array($status, $allowedStatuses)) {
    sendJsonResponse('error', 'Invalid status value', null, 400);
}



$stmt = $conn->prepare("UPDATE appointments SET status = ? WHERE id = ?");
if (!$stmt) {
    sendJsonResponse('error', 'DB prepare failed: ' . $conn->error, null, 500);
}

$stmt->bind_param("si", $status, $id);

if ($stmt->execute()) {
    $stmt->close();
    sendJsonResponse('success', 'Appointment status updated to ' . $status);
} else {
    $stmt->close();
    sendJsonResponse('error', 'Error updating appointment: ' . $conn->error, null, 500);
}
?>
