<?php
include 'db.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse('error', 'Invalid request method', null, 405);
}

$patientId     = intval($_POST['billPatient'] ?? $_POST['patient_id'] ?? 0);
$docFee        = floatval($_POST['doctorFee'] ?? $_POST['doctor_fee'] ?? 0);
$medFee        = floatval($_POST['medicationFee'] ?? $_POST['medication_fee'] ?? 0);
$labFee        = floatval($_POST['labFee'] ?? $_POST['lab_fee'] ?? 0);
$discount      = floatval($_POST['discount'] ?? 0);
$paymentMethod = trim($_POST['paymentMethod'] ?? 'Cash');

if ($patientId <= 0) {
    $jsonInput = json_decode(file_get_contents('php://input'), true);
    if ($jsonInput) {
        $patientId     = intval($jsonInput['billPatient'] ?? $jsonInput['patient_id'] ?? 0);
        $docFee        = floatval($jsonInput['doctorFee'] ?? $jsonInput['doctor_fee'] ?? 0);
        $medFee        = floatval($jsonInput['medicationFee'] ?? $jsonInput['medication_fee'] ?? 0);
        $labFee        = floatval($jsonInput['labFee'] ?? $jsonInput['lab_fee'] ?? 0);
        $discount      = floatval($jsonInput['discount'] ?? 0);
        $paymentMethod = trim($jsonInput['paymentMethod'] ?? 'Cash');
    }
}

if ($patientId <= 0) {
    sendJsonResponse('error', 'Please select a valid patient to generate a bill!', null, 400);
}

$subtotal = $docFee + $medFee + $labFee;
$total    = max(0, $subtotal - $discount);




$stmt = $conn->prepare("INSERT INTO bills (patient_id, doctor_fee, medication_fee, lab_fee, discount, total_amount, status, payment_method) VALUES (?, ?, ?, ?, ?, ?, 'Paid', ?)");
if (!$stmt) {
    sendJsonResponse('error', 'DB prepare failed: ' . $conn->error, null, 500);
}

$stmt->bind_param("iddddds", $patientId, $docFee, $medFee, $labFee, $discount, $total, $paymentMethod);

if ($stmt->execute()) {
    $billId = $conn->insert_id;
    $stmt->close();
    sendJsonResponse('success', 'Invoice Saved to Database!', [
        'id'             => $billId,
        'patient_id'     => $patientId,
        'doctor_fee'     => $docFee,
        'medication_fee' => $medFee,
        'lab_fee'        => $labFee,
        'discount'       => $discount,
        'total_amount'   => $total,
        'status'         => 'Paid',
        'payment_method' => $paymentMethod,
        'created_at'     => date('Y-m-d H:i:s')
    ]);
} else {
    $stmt->close();
    sendJsonResponse('error', 'Database insert failed: ' . $conn->error, null, 500);
}
?>