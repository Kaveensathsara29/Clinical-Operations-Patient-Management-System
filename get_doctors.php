<?php
include 'db.php';

header('Content-Type: application/json; charset=utf-8');



$sql = "SELECT * FROM doctors ORDER BY id ASC";
$result = $conn->query($sql);
$doctors = [];

if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $doctors[] = $row;
    }
}

sendJsonResponse('success', 'Doctors loaded successfully', $doctors);
?>
