<?php
include 'db.php';
session_start();
session_unset();
session_destroy();
sendJsonResponse('success', 'Logged out successfully');
?>
