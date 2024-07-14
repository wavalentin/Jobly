/**
 * Parses a string and returns a boolean value.
 * 
 * @param {string} value - The string to be parsed.
 * 
 * @returns { boolean | null } - The boolean value represented by the string, or null,
 *                              if the string is not a valid boolean representation.
 */

function parseBool(value) {
    if (value === 'true' || value === '1') {
        return true;
    } else if (value === 'false' || value === '0') {
        return false;
    }
    return null;
};

module.exports = { parseBool };