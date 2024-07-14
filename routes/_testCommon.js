"use strict";

const db = require("../db.js");
const User = require("../models/user");
const Company = require("../models/company");
const Job = require("../models/job");

const { createToken } = require("../helpers/tokens");

let jobIDs = [];

async function commonBeforeAll() {
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM users");
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM companies");
  // noinspection SqlWithoutWhere
  await db.query("DELETE FROM jobs");

  await Company.create(
      {
        handle: "c1",
        name: "C1",
        numEmployees: 1,
        description: "Desc1",
        logoUrl: "http://c1.img",
      });
  await Company.create(
      {
        handle: "c2",
        name: "C2",
        numEmployees: 2,
        description: "Desc2",
        logoUrl: "http://c2.img",
      });
  await Company.create(
      {
        handle: "c3",
        name: "C3",
        numEmployees: 3,
        description: "Desc3",
        logoUrl: "http://c3.img",
      });
  await Company.create(
      {
        handle: "m1",
        name: "Microsoft",
        logoUrl: "http://micro.img",
        description: "DescMicro",
        numEmployees: 10
      });

  await User.register({
    username: "u1",
    firstName: "U1F",
    lastName: "U1L",
    email: "user1@user.com",
    password: "password1",
    isAdmin: false,
  });
  await User.register({
    username: "u2",
    firstName: "U2F",
    lastName: "U2L",
    email: "user2@user.com",
    password: "password2",
    isAdmin: false,
  });
  await User.register({
    username: "u3",
    firstName: "U3F",
    lastName: "U3L",
    email: "user3@user.com",
    password: "password3",
    isAdmin: false,
  });
  await User.register({
    username: "a1",
    firstName: "A1F",
    lastName: "A1L",
    email: "userA@user.com",
    isAdmin: true
  });

  const job1 = await Job.create(
    {
      title: "J1",
      salary: 1,
      equity: .1,
      company_handle: "c1"
    });
  jobIDs.push(job1.id);

  const job2 = await Job.create(
    {
      title: "J2",
      salary: 2,
      equity: .2,
      company_handle: "c2"
    });
  jobIDs.push(job2.id);

  const job3 = await Job.create(
    {
      title: "J3",
      salary: 3,
      equity: 0,
      company_handle: "c3"
    });
  jobIDs.push(job3.id);

  const job4 = await Job.create(
    {
      title: "Data Engineer",
      salary: 150,
      equity: .15,
      company_handle: "m1"
    });
  jobIDs.push(job4.id);
}

async function commonBeforeEach() {
  await db.query("BEGIN");
}

async function commonAfterEach() {
  await db.query("ROLLBACK");
}

async function commonAfterAll() {
  await db.end();
}

const u1Token = createToken({ username: "u1", isAdmin: false });
const a1Token = createToken({ username: "a1", isAdmin: true });

module.exports = {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  a1Token,
  jobIDs
};