<?php
// Prevent direct output buffering issues
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Allow CORS if needed
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");

$env = parse_ini_file('.env');

$host = $env["DB_HOST"];
$username = $env["DB_USER"];
$password = $env["DB_PASS"];
$dbname = $env["DB_NAME"];

// Suppress default mysqli exception throwing & warnings to allow graceful fallback
mysqli_report(MYSQLI_REPORT_OFF);

$db_connected = false;
$db_error = null;
$conn = !null;

try {
    $conn = @new mysqli($host, $username, $password);
    if ($conn && !$conn->connect_error) {
        // Ensure database exists
        // $conn->query("CREATE DATABASE IF NOT EXISTS `$dbname`");
        $conn->select_db($dbname);
        $conn->set_charset("utf8mb4");
        $db_connected = true;

        // Auto-initialize required database tables if missing
        $conn->query("CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            full_name VARCHAR(100) DEFAULT 'Clinic Admin',
            role VARCHAR(20) DEFAULT 'Admin',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        $userCheck = $conn->query("SELECT id FROM users LIMIT 1");
        if ($userCheck && $userCheck->num_rows === 0) {
            $conn->query("INSERT INTO users (username, password, full_name, role) VALUES ('admin', '123', 'Admin', 'Admin')");
        }

        $conn->query("CREATE TABLE IF NOT EXISTS patients (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(100) NOT NULL,
            age INT NOT NULL,
            gender VARCHAR(10) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            email VARCHAR(100) DEFAULT '',
            blood_group VARCHAR(10) DEFAULT 'O+',
            address TEXT NOT NULL,
            medical_history TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        $conn->query("CREATE TABLE IF NOT EXISTS doctors (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(100) NOT NULL,
            specialty VARCHAR(100) NOT NULL,
            qualification VARCHAR(100) DEFAULT 'MBBS, MD',
            phone VARCHAR(20) NOT NULL,
            room_no VARCHAR(20) DEFAULT 'Room 101',
            status VARCHAR(20) DEFAULT 'Available',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

      
        

        $conn->query("CREATE TABLE IF NOT EXISTS appointments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            patient_id INT NOT NULL,
            doctor_name VARCHAR(100) NOT NULL,
            appointment_date DATE NOT NULL,
            appointment_time TIME NOT NULL,
            notes TEXT DEFAULT '',
            status VARCHAR(20) DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        $conn->query("CREATE TABLE IF NOT EXISTS bills (
            id INT AUTO_INCREMENT PRIMARY KEY,
            patient_id INT NOT NULL,
            doctor_fee DECIMAL(10,2) DEFAULT 0.00,
            medication_fee DECIMAL(10,2) DEFAULT 0.00,
            lab_fee DECIMAL(10,2) DEFAULT 0.00,
            discount DECIMAL(10,2) DEFAULT 0.00,
            total_amount DECIMAL(10,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'Paid',
            payment_method VARCHAR(30) DEFAULT 'Cash',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
    } else {
        $db_connected = false;
        $db_error = ($conn && is_object($conn) && isset($conn->connect_error)) ? $conn->connect_error : "MySQL service unreachable";
    }
} catch (Throwable $e) {
    $db_connected = false;
    $db_error = $e->getMessage();
}

/**
 * Standard JSON response helper
 */
function sendJsonResponse($status, $message, $data = null, $httpCode = 200) {
    global $db_connected;
    http_response_code($httpCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status' => $status,
        'db_connected' => $db_connected,
        'message' => $message,
        'data' => $data,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}
?>
