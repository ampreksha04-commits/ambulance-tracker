CREATE DATABASE IF NOT EXISTS ambulance;
USE ambulance;

CREATE TABLE IF NOT EXISTS ambulances (
  id         VARCHAR(32) PRIMARY KEY,
  lat        DECIMAL(9,6) NOT NULL,
  lng        DECIMAL(9,6) NOT NULL,
  speed      DECIMAL(5,1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  ambulance_id VARCHAR(32) NOT NULL,
  lat          DECIMAL(9,6) NOT NULL,
  lng          DECIMAL(9,6) NOT NULL,
  speed        DECIMAL(5,1) NOT NULL DEFAULT 0,
  recorded_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ambulance_time (ambulance_id, recorded_at),
  FOREIGN KEY (ambulance_id) REFERENCES ambulances(id)
);
