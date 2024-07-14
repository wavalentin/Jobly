"use strict";

const { sqlForPartialUpdate } = require('./sql');
const { BadRequestError } = require('../expressError');

describe("sqlForPartialUpdate", () => {
    test("should generate correct SQL query parts for a valid input", () => {
        const dataToUpdate = { firstName: 'Aliya', age: 32 };
        const jsToSql = { firstName: 'first_name' };
        const result = sqlForPartialUpdate(dataToUpdate, jsToSql);

        expect(result).toEqual({
            setCols: '"first_name"=$1, "age"=$2',
            values: ['Aliya', 32]
        });
    });

    test("should throw BadRequestError for empty data", () => {
        expect(() => {
            sqlForPartialUpdate({}, {})
        }).toThrow(BadRequestError);
    });
});