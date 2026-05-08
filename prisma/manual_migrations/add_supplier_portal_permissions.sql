-- Migration: Add supply_chain.manage permission to Admin and procurement_manager roles

DROP PROCEDURE IF EXISTS add_supply_chain_manage_permission;
DELIMITER $$
CREATE PROCEDURE add_supply_chain_manage_permission()
BEGIN
  UPDATE Role
  SET permissions = JSON_ARRAY_APPEND(COALESCE(permissions, JSON_ARRAY()), '$', 'supply_chain.manage')
  WHERE name IN ('Admin', 'procurement_manager', 'Supply Chain Manager')
    AND (
      permissions IS NULL
      OR NOT JSON_CONTAINS(permissions, '"supply_chain.manage"')
    );
END$$
DELIMITER ;
CALL add_supply_chain_manage_permission();
DROP PROCEDURE IF EXISTS add_supply_chain_manage_permission;
