"use strict";

/** Routes for users. */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureLoggedIn, ensureAdmin } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");
const User = require("../models/user");
const { createToken } = require("../helpers/tokens");
const userNewSchema = require("../schemas/userNew.json");
const userUpdateSchema = require("../schemas/userUpdate.json");

const router = express.Router();


/** POST / { user }  => { user, token }
 *
 * Adds a new user. This is not the registration endpoint --- instead, this is
 * only for admin users to add new users. The new user being added can be an
 * admin.
 *
 * This returns the newly created user and an authentication token for them:
 *  {user: { username, firstName, lastName, email, isAdmin }, token }
 *
 * Authorization required: login and admin rights.
 **/

router.post("/", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.register(req.body);
    const token = createToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    return next(err);
  }
});


/** GET / => { users: [ {username, firstName, lastName, email }, ... ] }
 *
 * Returns list of all users.
 *
 * Authorization required: login and admin rights
 **/

router.get("/", ensureAdmin, async function (req, res, next) {
  try {
    const users = await User.findAll();
    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});


/** GET /[username] => { user }
 *
 * Returns { username, firstName, lastName, isAdmin, jobs }
 *  where jobs is { id, title, companyHandle, companyName, state }
 *
 * Authorization required: if user making request == username ->login only,
 *  otherwise, requestor must have admin rights.
 **/

router.get("/:username", ensureLoggedIn, async function (req, res, next) {
  try {
    const requestorUsername = res.locals.user.username;
    const targetUsername = req.params.username;

    if (requestorUsername === targetUsername) {
      const user = await User.get(targetUsername);
      return res.json({ user });
    } else {
      return  ensureAdmin(req, res, async () => {
          const user = await User.get(targetUsername);
          return res.json({ user });
      });
    }
  } catch (err) {
    return next(err);
  }
});


/** PATCH /[username] { user } => { user }
 *
 * Data can include:
 *   { firstName, lastName, password, email }
 *
 * Returns { username, firstName, lastName, email, isAdmin }
 *
 * Authorization required: if user making request == username ->login only,
 *  otherwise, requestor must have admin rights.
  **/

router.patch("/:username", ensureLoggedIn, async function (req, res, next) {
  try {
    const requestorUsername = res.locals.user.username;
    const targetUsername = req.params.username;

    const validator = jsonschema.validate(req.body, userUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    if (requestorUsername === targetUsername) {
      const user = await User.update(targetUsername, req.body);
      return res.json({ user });
    } else {
      ensureAdmin(req, res, async () => 
        await User.update(targetUsername, req.body)
        .then(user => res.json({ user }))
        .catch(next));    
    }
  } catch (err) {
    return next(err);
  }
});


/** DELETE /[username]  =>  { deleted: username }
 *
 * Authorization required: if user making request == username ->login only,
 *  otherwise, requestor must have admin rights.
**/

router.delete("/:username", ensureLoggedIn, async function (req, res, next) {
  try {
    const requestorUsername = res.locals.user.username;
    const targetUsername = req.params.username;

    if (requestorUsername === targetUsername) {
      await User.remove(targetUsername);
      return res.json({ deleted: targetUsername });
    } else {
      ensureAdmin(req, res, async () =>
        await User.remove(targetUsername)
        .then(() => res.json({ deleted: targetUsername }))
        .catch(next));
    }
  } catch (err) {
    return next(err);
  }
});

/** POST /[username]/jobs/[id] { state } => { application }
 * 
 * @returns {Object} - key "applied", value jobId
 * 
 * Requires admin authorization or same-user-as-username
 * */

router.post("/:username/jobs/:id", ensureLoggedIn, ensureAdmin, async (req, res, next) => {
  try {
    const jobID = req.params.id;

    const requestorUsername = res.locals.user.username;
    const targetUsername = req.params.username;

    if (requestorUsername === targetUsername) {
      await User.applyToJob(req.params.username, jobID);
      return res.json({ applied: jobID });
    } else {
      ensureAdmin(req, res, async () =>
        await User.applyToJob(req.params.username, jobID)
        .then(() => res.json({ applied: jobID }))
        .catch(next));
    }
  } catch (err) {
    return next(err);
  }
});

module.exports = router;