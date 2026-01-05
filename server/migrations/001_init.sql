CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  photo_url TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessments (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  created_at BIGINT NOT NULL,
  building VARCHAR(255),
  floor VARCHAR(255),
  room VARCHAR(255),
  category VARCHAR(255) NOT NULL,
  element VARCHAR(255) NOT NULL,
  condition_rating INT NOT NULL,
  priority_rating INT NOT NULL,
  damage_category VARCHAR(255),
  root_cause VARCHAR(255),
  root_cause_details TEXT,
  notes TEXT,
  latitude DOUBLE,
  longitude DOUBLE,
  photo_uri TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_assessments_user (user_id),
  INDEX idx_assessments_created_at (created_at)
);
