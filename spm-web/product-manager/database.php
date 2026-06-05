<?php
// Ganti dengan kredensial MySQL InfinityFree kamu
$host = "if0_41860010sql206.infinityfree.com";
$user = "if0_41860010";
$pass = "hQ99jL5bPV0Pf";
$dbname = "if0_41860010_db_produk";
define('DB_HOST', $host);   // host dari cPanel InfinityFree
define('DB_USER', $user);   // username database
define('DB_PASS', $pass);   // password database
define('DB_NAME', $dbname); // nama database

function getConnection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        http_response_code(500);
        die(json_encode(['error' => 'Koneksi database gagal: ' . $conn->connect_error]));
    }
    $conn->set_charset('utf8mb4');
    return $conn;
}
