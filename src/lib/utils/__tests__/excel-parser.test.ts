/**
 * Tests for Excel Parser
 * Run with: npm test or npx jest
 */

import { describe, it, expect } from '@jest/globals';
import { validateExcelData } from '../excel-parser';
import { ParsedExcelData } from '@/lib/types/project-migration';

describe('Excel Parser - Data Validation', () => {
  it('should validate correct project data', () => {
    const data: ParsedExcelData = {
      projects: [
        {
          project_code: 'PRJ-001',
          project_name: 'Test Project',
          client_name: 'Test Client',
          status: 'Active',
        },
      ],
      buildings: [],
    };

    const result = validateExcelData(data);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject missing project code', () => {
    const data: ParsedExcelData = {
      projects: [
        {
          project_code: '',
          project_name: 'Test Project',
        },
      ],
      buildings: [],
    };

    const result = validateExcelData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].field).toBe('project_code');
  });

  it('should reject duplicate project codes', () => {
    const data: ParsedExcelData = {
      projects: [
        {
          project_code: 'PRJ-001',
          project_name: 'Project 1',
        },
        {
          project_code: 'PRJ-001',
          project_name: 'Project 2',
        },
      ],
      buildings: [],
    };

    const result = validateExcelData(data);
    expect(result.valid).toBe(false);
    const duplicateError = result.errors.find(e => e.message.includes('Duplicate'));
    expect(duplicateError).toBeDefined();
  });

  it('should reject invalid status enum', () => {
    const data: ParsedExcelData = {
      projects: [
        {
          project_code: 'PRJ-001',
          project_name: 'Test Project',
          status: 'InvalidStatus' as any,
        },
      ],
      buildings: [],
    };

    const result = validateExcelData(data);
    expect(result.valid).toBe(false);
    const statusError = result.errors.find(e => e.field === 'status');
    expect(statusError).toBeDefined();
  });

  it('should reject building with non-existent project', () => {
    const data: ParsedExcelData = {
      projects: [
        {
          project_code: 'PRJ-001',
          project_name: 'Test Project',
        },
      ],
      buildings: [
        {
          project_code: 'PRJ-999',
          building_code: 'BLD-A',
          building_name: 'Building A',
        },
      ],
    };

    const result = validateExcelData(data);
    expect(result.valid).toBe(false);
    const buildingError = result.errors.find(e => 
      e.message.includes('non-existent project')
    );
    expect(buildingError).toBeDefined();
  });

  it('should warn about missing optional fields', () => {
    const data: ParsedExcelData = {
      projects: [
        {
          project_code: 'PRJ-001',
          project_name: 'Test Project',
          // Missing client_name and project_manager
        },
      ],
      buildings: [],
    };

    const result = validateExcelData(data);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should validate building types', () => {
    const data: ParsedExcelData = {
      projects: [
        {
          project_code: 'PRJ-001',
          project_name: 'Test Project',
        },
      ],
      buildings: [
        {
          project_code: 'PRJ-001',
          building_code: 'BLD-A',
          building_name: 'Building A',
          building_type: 'InvalidType' as any,
        },
      ],
    };

    const result = validateExcelData(data);
    expect(result.valid).toBe(false);
    const typeError = result.errors.find(e => e.field === 'building_type');
    expect(typeError).toBeDefined();
  });

  it('should accept valid building types', () => {
    const validTypes = ['HR', 'PEB', 'MEP', 'Modular', 'Other'];

    validTypes.forEach(type => {
      const data: ParsedExcelData = {
        projects: [
          {
            project_code: 'PRJ-001',
            project_name: 'Test Project',
          },
        ],
        buildings: [
          {
            project_code: 'PRJ-001',
            building_code: 'BLD-A',
            building_name: 'Building A',
            building_type: type as any,
          },
        ],
      };

      const result = validateExcelData(data);
      expect(result.valid).toBe(true);
    });
  });

  it('should count projects and buildings correctly', () => {
    const data: ParsedExcelData = {
      projects: [
        { project_code: 'PRJ-001', project_name: 'Project 1' },
        { project_code: 'PRJ-002', project_name: 'Project 2' },
      ],
      buildings: [
        { project_code: 'PRJ-001', building_code: 'BLD-A', building_name: 'Building A' },
        { project_code: 'PRJ-001', building_code: 'BLD-B', building_name: 'Building B' },
        { project_code: 'PRJ-002', building_code: 'BLD-C', building_name: 'Building C' },
      ],
    };

    const result = validateExcelData(data);
    expect(result.projectsCount).toBe(2);
    expect(result.buildingsCount).toBe(3);
  });
});
