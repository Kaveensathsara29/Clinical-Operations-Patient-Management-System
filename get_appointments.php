<?php
include 'db.php';

header('Content-Type: application/json; charset=utf-8');



$search = isset($_GET['search']) ? trim($_GET['search']) : '';

if (!empty($search)) {
    $stmt = $conn->prepare("SELECT a.*, p.full_name AS patient_name, p.phone,
                   TIME_FORMAT(a.appointment_time, '%H:%i') AS appointment_time
            FROM appointments a
            LEFT JOIN patients p ON a.patient_id = p.id
            WHERE p.full_name LIKE ? OR p.phone LIKE ? OR a.doctor_name LIKE ? OR a.id LIKE ?
            ORDER BY a.appointment_date DESC, a.appointment_time ASC");
    $like = '%' . $search . '%';
    $stmt->bind_param("ssss", $like, $like, $like, $like);
    $stmt->execute();
    $result = $stmt->get_result();
} else {
    $sql = "SELECT a.*, p.full_name AS patient_name, p.phone,
                   TIME_FORMAT(a.appointment_time, '%H:%i') AS appointment_time
            FROM appointments a
            LEFT JOIN patients p ON a.patient_id = p.id
            ORDER BY a.appointment_date DESC, a.appointment_time ASC";
    $result = $conn->query($sql);
}

$appointments = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $appointments[] = $row;
    }
}

sendJsonResponse('success', 'Appointments loaded successfully', $appointments);
?>
