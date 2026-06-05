<?php
function setCorsHeaders() {
    // Ganti dengan URL GitHub Pages kamu
    // Contoh: https://username.github.io
    // Untuk development lokal, bisa pakai * sementara
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Content-Type: application/json; charset=UTF-8");

    // Handle preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

function sendError($message, $statusCode = 400) {
    sendResponse(['success' => false, 'message' => $message], $statusCode);
}

function getRequestBody() {
    return json_decode(file_get_contents('php://input'), true);
}
