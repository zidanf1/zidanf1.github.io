-- Jalankan SQL ini di phpMyAdmin InfinityFree
-- Menu: phpMyAdmin > pilih database > tab SQL > paste ini > klik GO

CREATE TABLE IF NOT EXISTS `products` (
  `id`        INT(11)        NOT NULL AUTO_INCREMENT,
  `nama`      VARCHAR(255)   NOT NULL,
  `harga`     DECIMAL(15,2)  NOT NULL DEFAULT 0.00,
  `stok`      INT(11)        NOT NULL DEFAULT 0,
  `deskripsi` TEXT           DEFAULT NULL,
  `created_at` TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Data contoh (opsional)
INSERT INTO `products` (`nama`, `harga`, `stok`, `deskripsi`) VALUES
('Laptop Gaming ASUS', 12500000, 5, 'Laptop gaming dengan RTX 4060, RAM 16GB'),
('Mouse Wireless Logitech', 350000, 20, 'Mouse wireless silent click, baterai tahan 18 bulan'),
('Keyboard Mechanical', 850000, 12, 'Keyboard mechanical RGB, switch blue'),
('Monitor 24 inch IPS', 2800000, 8, 'Monitor IPS Full HD 144Hz untuk gaming dan kerja');
