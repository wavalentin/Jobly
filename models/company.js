"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);
// handle must be all lowercase letters
    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** 
   * Find all companies with optional filtering.
   *
   * Retrieves a list of companies from the database, with the ability to apply
   * filters based on minimum employees, maximum employees, and partial, case-insensitive
   * name matching.
   * 
   * The filtering is flexible, allowing for any combination of the available filters
   * to be applied.  If no filters are provided, all companies are returned.
   * 
   * @param {Object} filters - An object containing the following optional filter parameters:
   *  - minEmployees (number): Minimum number of employees a company must have to be included in the results.
   *  - maxEmployees (number): Maximum number of employees a company can have to be included in the results.
   *  - nameLike (string): A case-insensitive substring to be matched with the company's name property.
   * 
   * @returns {Array} An array of objects, each representing a company.  Each object contains:
   *  - handle (string): Unique identifier for the company.
   *  - name (string): Name of the company.
   *  - description (string): A brief description of the company.
   *  - numEmployeees (number): The number of employees at the company.
   *  - logoUrl (uri string): URL of the company's logo.
   * 
   * If no companies match the filters, an empty array is returned.
   * 
   * Example usage:
   *  findAll({ minEmployees: 10, maxEmployees: 50, nameLike: "tech" })
   *    -> returns companies with 10-50 employees and 'tech' in their name
   * */

  static async findAll(filters = {}) {
    // Basic query without any filtering applied
    let query = `SELECT handle,
                    name,
                    description,
                    num_employees AS "numEmployees",
                    logo_url AS "logoUrl"
                 FROM companies`;
    let whereExpressions = [];
    let queryValues = [];

    // Add filter inputs to whereExpressions and queryValues for any and all filters present,
    // concatenate into complete query
    const { minEmployees, maxEmployees, nameLike } = filters;

    if (minEmployees !== undefined) {
      queryValues.push(minEmployees);
      whereExpressions.push(`num_employees >= $${queryValues.length}`);
    }
    if (maxEmployees !== undefined) {
      queryValues.push(maxEmployees);
      whereExpressions.push(`num_employees <= $${queryValues.length}`);
    }
    if (nameLike !== undefined) {
      // nameLike string is case-insensitive and returns any company whose name contains nameLike
      queryValues.push(`%${nameLike}%`);
      whereExpressions.push(`name ILIKE $${queryValues.length}`);
    }

    if(whereExpressions.length > 0) {
      query += " WHERE " + whereExpressions.join(" AND ");
    }
    query += " ORDER BY name";

    // execute the full query with filter inputs
    const companiesRes = await db.query(query, queryValues)
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
        [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    const jobsRes = await db.query(
      `SELECT id, title, salary, equity
        FROM jobs
        WHERE company_handle = $1
        ORDER BY id`,
      [handle]
    );
    company.jobs = jobsRes.rows;
    
    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;