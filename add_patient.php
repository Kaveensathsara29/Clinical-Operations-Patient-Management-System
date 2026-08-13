<?php
include 'db.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse('error', 'Invalid request method', null, 405);
}

// Read from POST fields first, then fall back to JSON body
$fullName     = trim($_POST['fullName'] ?? '');
$age          = intval($_POST['age'] ?? 0);
$gender       = trim($_POST['gender'] ?? '');
$phone        = trim($_POST['phone'] ?? '');
$email        = trim($_POST['email'] ?? '');
$bloodGroup   = trim($_POST['bloodGroup'] ?? 'O+');
$address      = trim($_POST['address'] ?? '');
$medicalHistory = trim($_POST['medicalHistory'] ?? '');

// If required fields missing, try JSON body
if (empty($fullName) || empty($phone)) {
    $jsonInput = json_decode(file_get_contents('php://input'), true);
    if ($jsonInput) {
        $fullName       = trim($jsonInput['fullName'] ?? '');
        $age            = intval($jsonInput['age'] ?? 0);
        $gender         = trim($jsonInput['gender'] ?? '');
        $phone          = trim($jsonInput['phone'] ?? '');
        $email          = trim($jsonInput['email'] ?? '');
        $bloodGroup     = trim($jsonInput['bloodGroup'] ?? 'O+');
        $address        = trim($jsonInput['address'] ?? '');
        $medicalHistory = trim($jsonInput['medicalHistory'] ?? '');
    }
}

// Validate required fields
if (empty($fullName)) {
    sendJsonResponse('error', 'Patient Full Name is required!', null, 400);
}
if (empty($phone)) {
    sendJsonResponse('error', 'Phone Number is required!', null, 400);
}
if (empty($gender)) {
    sendJsonResponse('error', 'Gender is required!', null, 400);
}
if ($age <= 0 || $age > 120) {
    sendJsonResponse('error', 'Please enter a valid age (1-120)!', null, 400);
}
if (empty($address)) {
    sendJsonResponse('error', 'Residential Address is required!', null, 400);
}
if (empty($bloodGroup)) {
    $bloodGroup = 'O+';
}



// DB is connected — insert into patients table
$stmt = $conn->prepare("INSERT INTO patients (full_name, age, gender, phone, email, blood_group, address, medical_history) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
if (!$stmt) {
    sendJsonResponse('error', 'DB prepare failed: ' . $conn->error, null, 500);
}

$stmt->bind_param("sissssss", $fullName, $age, $gender, $phone, $email, $bloodGroup, $address, $medicalHistory);

if ($stmt->execute()) {
    $newId = $conn->insert_id;
    $stmt->close();
    sendJsonResponse('success', 'Patient Registered & Saved to Database!', [
        'id'             => $newId,
        'full_name'      => $fullName,
        'age'            => $age,
        'gender'         => $gender,
        'phone'          => $phone,
        'email'          => $email,
        'blood_group'    => $bloodGroup,
        'address'        => $address,
        'medical_history'=> $medicalHistory
    ]);
} else {
    $stmt->close();
    sendJsonResponse('error', 'Database insert failed: ' . $conn->error, null, 500);
}
?>