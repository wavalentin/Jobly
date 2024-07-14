"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { id, title, salary, equity, company_handle }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ title, salary, equity, company_handle }) {
    const duplicateCheck = await db.query(
          `SELECT title, company_handle
           FROM jobs
           WHERE title = $1 AND company_handle = $2`,
        [title, company_handle]);
// handle must be all lowercase letters
    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate job: ${title} at company ${company_handle}`);

    const result = await db.query(
          `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle"`,
        [
          title,
          salary,
          equity,
          company_handle
        ]
    );
    const job = result.rows[0];

    return job;
  }

  /** 
   * Find all jobs with optional filtering.
   *
   * Retrieves a list of jobs from the database, with the ability to apply
   * filters based on minimum salary, hasEquity (boolean), and partial, case-insensitive
   * job title matching.
   * 
   * The filtering is flexible, allowing for any combination of the available filters
   * to be applied.  If no filters are provided, all jobs are returned.
   * 
   * @param {Object} filters - An object containing the following optional filter parameters:
   *  - minSalary (number): Minimum salary a job must provide to be included in the results.
   *  - hasEquity (boolean): If true return only the jobs that provide a non-zero amount of equity.
   *                        If false, or not listed, then disregard the equity property altogether.
   *  - titleLike (string): A case-insensitive substring to be matched with the job's title property.
   * 
   * @returns {Array} An array of objects, each representing a job.  Each object contains:
   *  - id (number): Unique identifier for the job.
   *  - title (string): Job title.
   *  - salary (number): Monetary compensation for working the job.
   *  - equity (number): Percentage of company ownership shares provided by the job to the employee.
   *  - company_handle (string): Foreign key linking the job to a company.
   * 
   * If no jobs match the filters, an empty array is returned.
   * 
   * Example usage:
   *  findAll({ minSalary: 10, hasEquity: true, titleLike: "tech" })
   *    -> returns jobs with at least 10 salary, non-zero equity, and 'tech' in their name
   * */

  static async findAll(filters = {}) {
    // Basic query without any filtering applied
    let query = `SELECT id,
                    title,
                    salary,
                    equity,
                    company_handle
                 FROM jobs`;
    let whereExpressions = [];
    let queryValues = [];

    // Add filter inputs to whereExpressions and queryValues for any and all filters present,
    // concatenate into complete query
    const { minSalary, hasEquity, titleLike } = filters;

    if (minSalary !== undefined) {
      queryValues.push(minSalary);
      whereExpressions.push(`salary >= $${queryValues.length}`);
    }
    if (hasEquity !== undefined && hasEquity !== false) {
      whereExpressions.push(`equity > 0`);
    }
    if (titleLike !== undefined) {
      // nameLike string is case-insensitive and returns any company whose name contains nameLike
      queryValues.push(`%${titleLike}%`);
      whereExpressions.push(`title ILIKE $${queryValues.length}`);
    }

    if(whereExpressions.length > 0) {
      query += " WHERE " + whereExpressions.join(" AND ");
    }
    query += " ORDER BY title";

    // execute the full query with filter inputs
    const jobsRes = await db.query(query, queryValues)
    return jobsRes.rows;
  }

  /** Given a job id, return data about the job.
   *
   * Returns { id, title, salary, equity, company_handle }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobRes = await db.query(
          `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle
           FROM jobs
           WHERE id = $1`,
        [id]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity, company_handle}
   *
   * Returns {id, title, salary, equity, company_handle}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data);
    const idVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id, 
                                title, 
                                salary, 
                                equity, 
                                company_handle`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    const result = await db.query(
          `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
        [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}

module.exports = Job;