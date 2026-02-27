-- Material Inspection Receipt (MIR) System
-- Links to Dolibarr Purchase Orders and tracks item receiving with quality inspection

-- Main MIR table - one receipt per PO delivery
CREATE TABLE IF NOT EXISTS material_inspection_receipts (
  id CHAR(36) PRIMARY KEY,
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Dolibarr PO linkage
  dolibarr_po_id VARCHAR(50) NOT NULL,
  dolibarr_po_ref VARCHAR(100) NOT NULL,
  supplier_name VARCHAR(255),
  project_id CHAR(36),
  
  -- Receipt info
  receipt_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  inspector_id CHAR(36) NOT NULL,
  
  -- Overall status
  status VARCHAR(50) NOT NULL DEFAULT 'In Progress',
  
  -- Notes
  remarks TEXT,
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_dolibarr_po_id (dolibarr_po_id),
  INDEX idx_project_id (project_id),
  INDEX idx_inspector_id (inspector_id),
  INDEX idx_receipt_date (receipt_date),
  INDEX idx_status (status),
  
  FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE SET NULL,
  FOREIGN KEY (inspector_id) REFERENCES user(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- MIR Items - one row per item from PO being received
CREATE TABLE IF NOT EXISTS material_inspection_receipt_items (
  id CHAR(36) PRIMARY KEY,
  receipt_id CHAR(36) NOT NULL,
  
  -- PO line item reference
  dolibarr_line_id VARCHAR(50),
  dolibarr_product_id VARCHAR(50),
  
  -- Item details
  item_name VARCHAR(255) NOT NULL,
  item_description TEXT,
  specification VARCHAR(255),
  
  -- Quantities
  ordered_qty DECIMAL(15,3) NOT NULL,
  received_qty DECIMAL(15,3) NOT NULL DEFAULT 0,
  accepted_qty DECIMAL(15,3) NOT NULL DEFAULT 0,
  rejected_qty DECIMAL(15,3) NOT NULL DEFAULT 0,
  unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
  
  -- Quality inspection per item
  quality_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  
  -- Surface condition check
  surface_condition VARCHAR(50),
  surface_notes TEXT,
  
  -- Dimensional check
  dimension_status VARCHAR(50),
  dimension_notes TEXT,
  
  -- Thickness check
  thickness_status VARCHAR(50),
  thickness_measured VARCHAR(100),
  thickness_notes TEXT,
  
  -- Specs compliance
  specs_compliance VARCHAR(50),
  specs_notes TEXT,
  
  -- Material Test Certificate (MTC)
  mtc_available BOOLEAN DEFAULT FALSE,
  mtc_number VARCHAR(100),
  mtc_file_path VARCHAR(500),
  
  -- Heat/Batch tracking
  heat_number VARCHAR(100),
  batch_number VARCHAR(100),
  
  -- Overall item result
  inspection_result VARCHAR(50) NOT NULL DEFAULT 'Pending',
  rejection_reason TEXT,
  
  -- Item notes
  remarks TEXT,
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_receipt_id (receipt_id),
  INDEX idx_dolibarr_product_id (dolibarr_product_id),
  INDEX idx_quality_status (quality_status),
  INDEX idx_inspection_result (inspection_result),
  
  FOREIGN KEY (receipt_id) REFERENCES material_inspection_receipts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- MIR Attachments - photos, documents, MTCs
CREATE TABLE IF NOT EXISTS material_inspection_receipt_attachments (
  id CHAR(36) PRIMARY KEY,
  receipt_id CHAR(36),
  item_id CHAR(36),
  
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(100),
  file_size INT,
  
  attachment_type VARCHAR(50) NOT NULL,
  description TEXT,
  
  uploaded_by CHAR(36) NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_receipt_id (receipt_id),
  INDEX idx_item_id (item_id),
  INDEX idx_attachment_type (attachment_type),
  
  FOREIGN KEY (receipt_id) REFERENCES material_inspection_receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES material_inspection_receipt_items(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES user(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
