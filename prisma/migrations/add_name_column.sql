-- Add name column to department_plans table
ALTER TABLE department_plans ADD COLUMN name VARCHAR(255) NULL;

-- Drop the unique constraint to allow multiple plans per department
ALTER TABLE department_plans DROP INDEX department_plans_annualPlanId_departmentId_key;
