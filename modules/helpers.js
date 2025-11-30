// helpers.js

/**
 * Convert SQL.js result to array of objects
 * @param {Array} result - Result from db.exec()
 * @returns {Array} Array of objects
 */
function resultToObjects(result) {
    if (!result || result.length === 0 || result[0].values.length === 0) {
        return [];
    }
    
    const columns = result[0].columns;
    const rows = result[0].values;
    
    return rows.map(values => {
        const obj = {};
        columns.forEach((column, index) => {
            obj[column] = values[index];
        });
        return obj;
    });
}

/**
 * Internal helper for updating isActive status
 * 
 * For internal use only by manager modules.
 * This provides the shared SQL logic while specific functions handle validation
 * 
 * @param {Object} db - SQL.js database instance
 * @param {string} tableName - Name of table to update
 * @param {string} idColumn - Name of ID column
 * @param {number} id - Record ID
 * @param {number} isActive - New status (0 or 1)
 * @private
 */
function _updateActiveStatus(db, tableName, idColumn, id, isActive) {
    if (isActive !== 0 && isActive !== 1) {
        throw new Error('isActive must be 0 or 1');
    }
    
    const sql = `UPDATE ${tableName} SET isActive = ? WHERE ${idColumn} = ?`;
    db.run(sql, [isActive, id]);
}

export {
    resultToObjects,
    _updateActiveStatus
};