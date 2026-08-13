<?php
include 'db.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    sendJsonResponse('error', 'Invalid request method', null, 405);
}

$id = intval($_REQUEST['id'] ?? 0);

if ($id <= 0) {
    $jsonInput = json_decode(file_get_contents('php://input'), true);
    if ($jsonInput) {
        $id = intval($jsonInput['id'] ?? 0);
    }
}

if ($id <= 0) {
    sendJsonResponse('error', 'Valid Patient ID is required', null, 400);
}



$stmt = $conn->prepare("DELETE FROM patients WHERE id = ?");
if (!$stmt) {
    sendJsonResponse('error', 'DB prepare failed: ' . $conn->error, null, 500);
}

$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    $stmt->close();
    sendJsonResponse('success', 'Patient deleted successfully');
} else {
    $stmt->close();
    sendJsonResponse('error', 'Error deleting patient: ' . $conn->error, null, 500);
}
?>
