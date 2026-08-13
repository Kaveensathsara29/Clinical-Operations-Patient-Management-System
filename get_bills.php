<?php
include 'db.php';

header('Content-Type: application/json; charset=utf-8');



$search = isset($_GET['search']) ? trim($_GET['search']) : '';

if (!empty($search)) {
    $stmt = $conn->prepare("SELECT b.*, p.full_name AS patient_name, p.phone
            FROM bills b
            LEFT JOIN patients p ON b.patient_id = p.id
            WHERE p.full_name LIKE ? OR p.phone LIKE ? OR b.payment_method LIKE ? OR b.id LIKE ?
            ORDER BY b.id DESC");
    $like = '%' . $search . '%';
    $stmt->bind_param("ssss", $like, $like, $like, $like);
    $stmt->execute();
    $result = $stmt->get_result();
} else {
    $sql = "SELECT b.*, p.full_name AS patient_name, p.phone
            FROM bills b
            LEFT JOIN patients p ON b.patient_id = p.id
            ORDER BY b.id DESC";
    $result = $conn->query($sql);
}

$bills = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $bills[] = $row;
    }
}

sendJsonResponse('success', 'Bills loaded successfully', $bills);
?>
