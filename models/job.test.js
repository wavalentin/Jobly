"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  jobIDs
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "New",
    salary: 100,
    equity: .1,
    company_handle: "c1"
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual(newJob);

    // The created job should include an auto-generated id
    expect(job).toEqual({
        id: expect.any(Number),
        ...newJob
    });

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = $1`,
        [job.id]
    );

    expect(result.rows).toEqual([
      {
        id: job.id,
        title: "New",
        salary: 100,
        equity: .1,
        company_handle: "c1"
      },
    ]);
  });

  test("bad request with dupe", async function () {
    try {
      await Job.create(newJob);
      await Job.create(newJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j1",
        salary: 1,
        equity: .1,
        company_handle: "c1"
      },
      {
        id: expect.any(Number),
        title: "j2",
        salary: 2,
        equity: .2,
        company_handle: "c2"
      },
      {
        id: expect.any(Number),
        title: "j3",
        salary: 3,
        equity: 0,
        company_handle: "c3"
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let jID = jobIDs[0].id;
    
    let gotJob = await Job.get(jID);
    expect(gotJob).toEqual({
        id: jID,
        title: jobs[0].title,
        salary: jobs[0].salary,
        equity: jobs[0].equity,
        company_handle: jobs[0].company_handle
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  test("works", async function () {
    let jID = jobIDs[0].id;

    const updateData = {
      title: "New",
      salary: 50,
      equity: .5,
      company_handle: "c1"
    };
  
    let patchJob = await Job.update(jID, updateData);
    expect(patchJob).toEqual({
      id: jID,
      ...updateData,
    });

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = $1`,
    [jID]);
    expect(result.rows).toEqual([{
      id: jID,
      title: "New",
      salary: 50,
      equity: .5,
      company_handle: "c1"
    }]);
  });

  test("works: null fields", async function () {
    let jID = jobIDs[0].id;

    const updateDataSetNulls = {
      title: "Newer",
      salary: null,
      equity: null,
      company_handle: "c1"
    };

    let job = await Job.update(jID, updateDataSetNulls);
    expect(job).toEqual({
      id: jID,
      ...updateDataSetNulls
    });

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE handle = $1`,
    [jID]);
    expect(result.rows).toEqual([{
      id: jID,
      title: "Newer",
      salary: null,
      equity: null,
      company_handle: "c1"
    }]);
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(0, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    let jID = jobIDs[0].id;

    try {
      await Job.update(jID, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    let jID = jobIDs[0].id;

    await Job.remove(jID);
    const res = await db.query(
        `SELECT id FROM jobs 
          WHERE id = $1`,
      [jID]);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such company", async function () {
    try {
      await Job.remove(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});