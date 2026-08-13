<?php
include 'db.php';

header('Content-Type: application/json; charset=utf-8');



$search = isset($_GET['search']) ? trim($_GET['search']) : '';

if (!empty($search)) {
    $stmt = $conn->prepare("SELECT * FROM patients WHERE full_name LIKE ? OR phone LIKE ? ORDER BY id DESC");
    $like = '%' . $search . '%';
    $stmt->bind_param("ss", $like, $like);
    $stmt->execute();
    $result = $stmt->get_result();
} else {
    $result = $conn->query("SELECT * FROM patients ORDER BY id DESC");
}

$patients = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $patients[] = $row;
    }
}

sendJsonResponse('success', 'Patients loaded successfully', $patients);
?>
