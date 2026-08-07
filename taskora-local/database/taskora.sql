CREATE DATABASE IF NOT EXISTS taskora
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE taskora;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  avatar_url  VARCHAR(500) DEFAULT NULL,
  language    VARCHAR(5)  NOT NULL DEFAULT 'id',
  theme       VARCHAR(10) NOT NULL DEFAULT 'light',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE tasks (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  deadline    DATETIME DEFAULT NULL,
  priority    ENUM('high','medium','low') NOT NULL DEFAULT 'medium',
  is_done     TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_tasks_user_deadline (user_id, deadline)
) ENGINE=InnoDB;

CREATE TABLE schedules (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  day_of_week TINYINT NOT NULL COMMENT '0=Senin .. 5=Sabtu',
  subject     VARCHAR(150) NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_schedules_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_schedules_user_day (user_id, day_of_week)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  task_id    INT DEFAULT NULL,
  message    VARCHAR(255) NOT NULL,
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Akun demo: demo@taskora.id / password123
INSERT INTO users (name, email, password) VALUES
  ('Siswa Demo', 'demo@taskora.id',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');

INSERT INTO tasks (user_id, title, description, deadline, priority, is_done) VALUES
  (1, 'Tugas Matematika Bab 3', 'Kerjakan soal nomor 1-20 halaman 87.', '2026-03-05 23:59:00', 'high', 0),
  (1, 'Laporan Praktikum Fisika', 'Analisis hasil percobaan hukum Ohm.', '2026-03-08 17:00:00', 'medium', 0),
  (1, 'Resume Sejarah', 'Ringkas materi kemerdekaan Indonesia.', '2026-02-28 12:00:00', 'low', 1);

INSERT INTO schedules (user_id, day_of_week, subject, start_time, end_time) VALUES
  (1, 0, 'Matematika', '07:30:00', '09:00:00'),
  (1, 0, 'Bahasa Indonesia', '09:15:00', '10:45:00'),
  (1, 2, 'Fisika', '08:00:00', '09:30:00'),
  (1, 4, 'Sejarah', '10:00:00', '11:30:00');
