// ============================================================================
// dbHelpers.ts - Core database utility helpers
// ============================================================================

import type { Database, QueryExecResult } from 'sql.js';

/**
 * Convert SQL.js result to array of objects
 * @param result - Result from db.exec()
 * @returns Array of typed objects
 */
export function resultToObjects<T>(result: QueryExecResult[]): T[] {
  if (!result || result.length === 0 || result[0].values.length === 0) {
    return [];
  }
  
  const columns = result[0].columns;
  const rows = result[0].values;
  
  return rows.map(values => {
    const obj: Record<string, any> = {};
    columns.forEach((column, index) => {
      obj[column] = values[index];
    });
    return obj as T;
  });
}

/**
 * Internal helper for updating isActive status
 */
export function _updateActiveStatus(
  db: Database,
  tableName: string,
  idColumn: string,
  id: number,
  isActive: number
): void {
  if (isActive !== 0 && isActive !== 1) {
    throw new Error('isActive must be 0 or 1');
  }
  
  const sql = `UPDATE ${tableName} SET isActive = ? WHERE ${idColumn} = ?`;
  db.run(sql, [isActive, id]);
}