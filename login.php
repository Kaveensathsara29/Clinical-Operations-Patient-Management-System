<?php
include 'db.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Read input (support both form-data and json payload)
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if (empty($username) || empty($password)) {
        $jsonInput = json_decode(file_get_contents('php://input'), true);
        if ($jsonInput) {
            $username = trim($jsonInput['username'] ?? '');
            $password = trim($jsonInput['password'] ?? '');
        }
    }

    if (empty($username) || empty($password)) {
        sendJsonResponse('error', 'Username and Password are required!', null, 400);
    }

    // Default fallback check for admin / 123 if DB connection is offline
    if (!$db_connected) {
        if ($username === 'admin' && $password === '123') {
            $_SESSION['user'] = 'admin';
            $_SESSION['user_name'] = 'Admin';
            sendJsonResponse('success', 'Login Successful (Offline Mode)', [
                'username' => 'admin',
                'full_name' => 'Admin',
                'role' => 'Admin'
            ]);
        } else {
            sendJsonResponse('error', 'Incorrect Username or Password!', null, 401);
        }
    }

    $stmt = $conn->prepare("SELECT id, username, password, full_name, role FROM users WHERE username = ?");
    if (!$stmt) {
        // Fallback to simple match
        if ($username === 'admin' && $password === '123') {
            $_SESSION['user'] = 'admin';
            $_SESSION['user_name'] = 'Admin';
            sendJsonResponse('success', 'Login Successful', [
                'username' => 'admin',
                'full_name' => 'Admin',
                'role' => 'Admin'
            ]);
        } else {
            sendJsonResponse('error', 'Incorrect Username or Password!', null, 401);
        }
    }

    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        // Plain text check or hashed check
        if ($password === $row['password'] || password_verify($password, $row['password'])) {
            $_SESSION['user'] = $row['username'];
            $_SESSION['user_name'] = $row['full_name'];
            $_SESSION['role'] = $row['role'];

            sendJsonResponse('success', 'Login Successful', [
                'username' => $row['username'],
                'full_name' => $row['full_name'],
                'role' => $row['role']
            ]);
        } else {
            sendJsonResponse('error', 'Incorrect Username or Password!', null, 401);
        }
    } else {
        // Allow default admin / 123
        if ($username === 'admin' && $password === '123') {
            $_SESSION['user'] = 'admin';
            $_SESSION['user_name'] = 'Admin';
            sendJsonResponse('success', 'Login Successful', [
                'username' => 'admin',
                'full_name' => 'Admin',
                'role' => 'Admin'
            ]);
        } else {
            sendJsonResponse('error', 'Incorrect Username or Password!', null, 401);
        }
    }

    $stmt->close();
    $conn->close();
} else {
    sendJsonResponse('error', 'Invalid request method', null, 405);
}
?>