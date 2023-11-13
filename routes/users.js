const express = require("express");
const router = express.Router();
const User = require("../models/user");
const passport = require("passport");

router.get("/register", (req, res) => {
  res.render("users/register");
});

// register user to the database and redirect them back home after registration is complete

router.post("/register", async (req, res) => {
  const { email, username, password } = req.body;
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.render("users/register", {
      error: "Username is already in u se",
    });
  }
  const user = new User({ email, username });
  const registerUser = await User.register(user, password);
  console.log(registerUser);
  res.redirect("/campgrounds");
});

router.get("/login", (req, res) => {
  res.render("users/login");
});

router.post(
  "/login",
  passport.authenticate("local", {
    failureFlash: true,
    failureRedirect: "/login",
  }),
  (req, res) => {
    res.redirect("/campgrounds");
  }
);

module.exports = router;
