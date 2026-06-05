<?php
require_once '../config/database.php';
require_once '../config/helpers.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {

    // =====================
    // GET - Ambil semua / satu produk
    // =====================
    case 'GET':
        $conn = getConnection();

        if ($id) {
            // Ambil satu produk
            $stmt = $conn->prepare("SELECT * FROM products WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $product = $result->fetch_assoc();

            if (!$product) {
                sendError('Produk tidak ditemukan', 404);
            }

            sendResponse(['success' => true, 'data' => $product]);
        } else {
            // Ambil semua produk
            $result = $conn->query("SELECT * FROM products ORDER BY id DESC");
            $products = [];
            while ($row = $result->fetch_assoc()) {
                $products[] = $row;
            }
            sendResponse(['success' => true, 'data' => $products, 'total' => count($products)]);
        }

        $conn->close();
        break;

    // =====================
    // POST - Tambah produk baru
    // =====================
    case 'POST':
        $body = getRequestBody();

        // Validasi input
        if (empty($body['nama']) || empty($body['harga'])) {
            sendError('Nama dan harga produk wajib diisi');
        }

        $nama     = trim($body['nama']);
        $harga    = (float)$body['harga'];
        $stok     = isset($body['stok']) ? (int)$body['stok'] : 0;
        $deskripsi = isset($body['deskripsi']) ? trim($body['deskripsi']) : '';

        $conn = getConnection();
        $stmt = $conn->prepare(
            "INSERT INTO products (nama, harga, stok, deskripsi) VALUES (?, ?, ?, ?)"
        );
        $stmt->bind_param("sdis", $nama, $harga, $stok, $deskripsi);

        if ($stmt->execute()) {
            $newId = $conn->insert_id;
            sendResponse([
                'success' => true,
                'message' => 'Produk berhasil ditambahkan',
                'data'    => ['id' => $newId, 'nama' => $nama, 'harga' => $harga, 'stok' => $stok]
            ], 201);
        } else {
            sendError('Gagal menambahkan produk', 500);
        }

        $conn->close();
        break;

    // =====================
    // PUT - Update produk
    // =====================
    case 'PUT':
        if (!$id) sendError('ID produk diperlukan');

        $body = getRequestBody();

        if (empty($body['nama']) || empty($body['harga'])) {
            sendError('Nama dan harga produk wajib diisi');
        }

        $nama      = trim($body['nama']);
        $harga     = (float)$body['harga'];
        $stok      = isset($body['stok']) ? (int)$body['stok'] : 0;
        $deskripsi = isset($body['deskripsi']) ? trim($body['deskripsi']) : '';

        $conn = getConnection();
        $stmt = $conn->prepare(
            "UPDATE products SET nama=?, harga=?, stok=?, deskripsi=? WHERE id=?"
        );
        $stmt->bind_param("sdisi", $nama, $harga, $stok, $deskripsi, $id);

        if ($stmt->execute()) {
            if ($stmt->affected_rows === 0) {
                sendError('Produk tidak ditemukan', 404);
            }
            sendResponse(['success' => true, 'message' => 'Produk berhasil diupdate']);
        } else {
            sendError('Gagal mengupdate produk', 500);
        }

        $conn->close();
        break;

    // =====================
    // DELETE - Hapus produk
    // =====================
    case 'DELETE':
        if (!$id) sendError('ID produk diperlukan');

        $conn = getConnection();
        $stmt = $conn->prepare("DELETE FROM products WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            if ($stmt->affected_rows === 0) {
                sendError('Produk tidak ditemukan', 404);
            }
            sendResponse(['success' => true, 'message' => 'Produk berhasil dihapus']);
        } else {
            sendError('Gagal menghapus produk', 500);
        }

        $conn->close();
        break;

    default:
        sendError('Method tidak didukung', 405);
}
