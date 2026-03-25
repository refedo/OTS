-- Points Incentive System Migration
-- Adds tables for tracking user points, transactions, and point rules

-- User Points Balance Table (aggregate balance per user)
CREATE TABLE IF NOT EXISTS user_points (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  total_points INT NOT NULL DEFAULT 0,
  lifetime_points INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_earned_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_points_user FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Point Transactions Table (detailed log of all point changes)
CREATE TABLE IF NOT EXISTS point_transactions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  points INT NOT NULL,
  transaction_type ENUM('EARN', 'SPEND', 'BONUS', 'ADJUSTMENT', 'REDEMPTION') NOT NULL,
  source_type ENUM('TASK_COMPLETION', 'ON_TIME_BONUS', 'PRIORITY_BONUS', 'STREAK_BONUS', 'MANUAL', 'REDEMPTION') NOT NULL,
  source_id CHAR(36) NULL,
  description VARCHAR(500) NOT NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_point_transactions_user FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
  INDEX idx_point_transactions_user (user_id),
  INDEX idx_point_transactions_created (created_at),
  INDEX idx_point_transactions_type (transaction_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Point Rules Configuration Table
CREATE TABLE IF NOT EXISTS point_rules (
  id CHAR(36) PRIMARY KEY,
  rule_code VARCHAR(50) NOT NULL UNIQUE,
  rule_name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NULL,
  points INT NOT NULL,
  multiplier DECIMAL(5,2) NULL DEFAULT 1.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  conditions JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Point Redemption Rewards Table
CREATE TABLE IF NOT EXISTS point_rewards (
  id CHAR(36) PRIMARY KEY,
  reward_name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NULL,
  points_required INT NOT NULL,
  reward_type ENUM('BADGE', 'CERTIFICATE', 'GIFT', 'TIME_OFF', 'OTHER') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  quantity_available INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Badges/Achievements Table
CREATE TABLE IF NOT EXISTS user_badges (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  badge_code VARCHAR(50) NOT NULL,
  badge_name VARCHAR(100) NOT NULL,
  badge_icon VARCHAR(50) NULL,
  earned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_badges_user FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
  INDEX idx_user_badges_user (user_id),
  UNIQUE KEY uk_user_badge (user_id, badge_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default point rules
INSERT INTO point_rules (id, rule_code, rule_name, description, points, multiplier, is_active, conditions) VALUES
(UUID(), 'TASK_COMPLETE', 'Task Completion', 'Base points for completing any task', 10, 1.00, TRUE, NULL),
(UUID(), 'ON_TIME_BONUS', 'On-Time Completion', 'Bonus for completing task before or on due date', 5, 1.00, TRUE, '{"requiresDueDate": true}'),
(UUID(), 'EARLY_COMPLETION', 'Early Bird Bonus', 'Extra bonus for completing task 2+ days early', 10, 1.00, TRUE, '{"daysEarly": 2}'),
(UUID(), 'HIGH_PRIORITY', 'High Priority Multiplier', 'Multiplier for high priority tasks', 0, 1.50, TRUE, '{"priority": "High"}'),
(UUID(), 'STREAK_3', '3-Day Streak', 'Bonus for completing tasks 3 days in a row', 15, 1.00, TRUE, '{"streakDays": 3}'),
(UUID(), 'STREAK_7', 'Week Warrior', 'Bonus for completing tasks 7 days in a row', 50, 1.00, TRUE, '{"streakDays": 7}'),
(UUID(), 'STREAK_30', 'Monthly Champion', 'Bonus for completing tasks 30 days in a row', 200, 1.00, TRUE, '{"streakDays": 30}');

-- Insert default badges
INSERT INTO user_badges (id, user_id, badge_code, badge_name, badge_icon, earned_at) 
SELECT UUID(), id, 'FIRST_TASK', 'First Task', 'trophy', NOW() 
FROM User WHERE 1=0; -- Template only, no actual inserts

-- Create view for leaderboard
CREATE OR REPLACE VIEW v_points_leaderboard AS
SELECT 
  up.user_id,
  u.name AS user_name,
  u.position,
  d.name AS department_name,
  up.total_points,
  up.lifetime_points,
  up.current_streak,
  up.longest_streak,
  up.last_earned_at,
  (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = up.user_id) AS badge_count
FROM user_points up
JOIN User u ON up.user_id = u.id
LEFT JOIN Department d ON u.departmentId = d.id
WHERE u.status = 'active'
ORDER BY up.total_points DESC;
