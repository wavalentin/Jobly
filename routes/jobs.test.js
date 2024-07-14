"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  a1Token,
  jobIDs
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************ Use filtering with GET route */
describe("GET /jobs", function () {
  test("should find job titles with a partial case-insensitive match", async function () {
    const res = await request(app)
                        .get("/jobs")
                        .query({ titleLike: 'data' });

    expect(res.statusCode).toEqual(200);
    const expectedJob = {
        title: "Data Engineer",
        salary: 150,
        equity: .15,
        company_handle: "m1"
    };
    expect(res.body.jobs).toEqual(expect.arrayContaining([
        expect.objectContaining(expectedJob)
    ]));
  });

  test("should filter to jobs with at least the salary specified", async function () {
    const res = await request(app)
                        .get("/jobs")
                        .query({ minSalary: 150 });

    expect(res.statusCode).toEqual(200);
    const expectedJob = {
        title: "Data Engineer",
        salary: 150,
        equity: .15,
        company_handle: "m1"
    };
    expect(res.body.jobs).toEqual(expect.arrayContaining([
        expect.objectContaining(expectedJob)
    ]));
  });

  test("should filter to jobs with hasEquity=true", async function () {
    const res = await request(app)
                        .get("/jobs")
                        .query({ hasEquity: 1 });

    expect(res.statusCode).toEqual(200);
    const expectedJobs = [
        { id: jobIDs[0], equity: 0.1 },
        { id: jobIDs[1], equity: 0.2 },
        { id: jobIDs[3], equity: 0.15 }
    ];

    expectedJobs.forEach(job => {
        expect(res.body).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: job.id, equity: job.equity })
        ]));
    });
  });

  test("should filter based on multiple query strings", async function () {
    const res = await request(app)
                        .get("/jobs")
                        .query({ titleLike: "j", minSalary: 1 });

    expect(res.statusCode).toEqual(200);
    const expectedJobs = [
        { id: jobIDs[0], title: "J1", salary: 1 },
        { id: jobIDs[1], title: "J2", salary: 2 },
        { id: jobIDs[2], title: "J3", salary: 3 }
    ];

    expectedJobs.forEach(job => {
        expect(res.body).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: job.id, title: job.title, salary: job.salary })
        ]));
    });
  });

  test("fails: minSalary < 0", async () => {
    const res = await request(app)
                        .get("/jobs")
                        .query({ minSalary: -10 });

    expect(res.statusCode).toEqual(400);
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
        .get("/jobs")
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "new",
    salary: 4,
    equity: 0,
    company_handle: "c1"
  };

  test("ok for admin users", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: "new",
        salary: 4,
        equity: 0,
        company_handle: "c1"
      }
    });
  });

  test("unauth for non-admin users", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          equity: .4,
          salary: 10,
        })
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          ...newJob,
          invalidField: "not-a-property",
        })
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs without any filtering */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs: [
        {
            id: expect.any(Number),
            title: "J1",
            salary: 1,
            equity: .1,
            company_handle: "c1"
        },
        {
            id: expect.any(Number),
            title: "J2",
            salary: 2,
            equity: .2,
            company_handle: "c2"
        },
        {
            id: expect.any(Number),
            title: "J3",
            salary: 3,
            equity: 0,
            company_handle: "c3"
        },
        {
            id: expect.any(Number),
            title: "Data Engineer",
            salary: 150,
            equity: .15,
            company_handle: "m1"
        }
      ]
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
        .get("/jobs")
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    let j1 = jobIDs[0].id;

    const resp = await request(app).get(`/jobs/${j1}`);
    expect(resp.body).toEqual({
      job: {
        id: j1,
        title: "J1",
        salary: 1,
        equity: .1,
        company_handle: "c1"
      }
    });
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/nope`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /companies/:handle */

describe("PATCH /jobs/:id", function () {
  test("works for admin users", async function () {
    let j1 = jobIDs[0].id;

    const resp = await request(app)
        .patch(`/jobs/${j1}`)
        .send({
          title: "J1-new"
        })
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.body).toEqual({
        job: {
            id: j1,
            title: "J1-new",
            salary: 1,
            equity: .1,
            company_handle: "c1"
          }
    });
  });

  test("unauth for non-admin users", async function () {
    let j1 = jobIDs[0].id;

    const resp = await request(app)
        .patch(`/jobs/${j1}`)
        .send({
          title: "J1-new",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    let j1 = jobIDs[0].id;

    const resp = await request(app)
        .patch(`/jobs/${j1}`)
        .send({
          title: "J1-new",
        });

    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
        .patch(`/jobs/nope`)
        .send({
          title: "new nope",
        })
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on id change attempt", async function () {
    let j1 = jobIDs[0].id;

    const resp = await request(app)
        .patch(`/jobs/${j1}`)
        .send({
          id: "j1-new",
        })
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    let j1 = jobIDs[0].id;

    const resp = await request(app)
        .patch(`/jobs/${j1}`)
        .send({
          nopeField: "not-a-property",
        })
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admin users", async function () {
    let j1 = jobIDs[0].id;

    const resp = await request(app)
        .delete(`/jobs/${j1}`)
        .set("authorization", `Bearer ${a1Token}`);

    expect(resp.body).toEqual({ deleted: j1 });
  });

  test("unauth for non-admin users", async function () {
    let j1 = jobIDs[0].id;

    const resp = await request(app)
        .delete(`/jobs/${j1}`)
        .set("authorization", `Bearer ${u1Token}`);

    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    let j1 = jobIDs[0].id;

    const resp = await request(app)
        .delete(`/jobs/${j1}`);

    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
        .delete(`/jobs/nope`)
        .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});