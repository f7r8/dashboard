// server.js
// where your node app starts

// we've started you off with Express (https://expressjs.com/)
// but feel free to use whatever libraries or frameworks you'd like through `package.json`.
require("dotenv").config({ path: __dirname + "/.env" });
const db = require("./database.js");
const express = require("express");
const passport = require("passport");
const csrf = require('csurf');
global.antixss = function (string = "") {
  if(typeof string !== "string") return "";
  string = string.replace('&', '&amp;');
  string = string.replace('<', '&lt;');
  string = string.replace('>', '&gt;');
  string = string.replace('/', '&#x2F');
  string = string.replace('"', '&quot;');
  string = string.replace("'", '&#x27;');
  return string;
};
global.antixsslinks = function (string = "") {
  if(typeof string !== "string") return "";
  string = string.replace('<', '&lt;');
  string = string.replace('>', '&gt;');
  string = string.replace('"', '&quot;');
  string = string.replace("'", '&#x27;');
  return string;
};
(async () => {
  if (process.argv[2] !== "ci") await db();
  const app = express();
  const session = require("express-session");
  const MongoStore = require("connect-mongo")(session);
  require("./strategies/discord.js");
  app.use(express.static(__dirname + "/public"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }))
  app.use(
    session({
      secret: process.env.SECRET || "?",
      cookie: {
        maxAge: 60000 * 60 * 24
      },
      saveUninitialized: false,
      resave: false,
      name: "discord.oauth2",
      store: new MongoStore({ mongooseConnection: require("mongoose").connection })
    })
  );
  app.set("view engine", "ejs");
  app.set("views", require("path").join(__dirname, "views"));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(csrf());
  app.use("/auth", require("./routes/auth"));
  app.use("/dashboard", require("./routes/dashboard"));
  app.use("/", require("./routes/main"));

  app.use(function (err, req, res, next) {
    if (err.code !== 'EBADCSRFTOKEN') return next(err)

    // handle CSRF token errors here
    res.status(403)
    res.send('form tampered with')
  })
  app.use(function (err, req, res, next) {
    if (err) {
      console.log(err);
      return res.status(500).send("Something happened: " + err);
    } else next();
  });
  app.use("*", function (req, res) {
    res.status(404).render("404", {
      username: req.user ? req.user.username : "stranger",
      csrfToken: req.csrfToken(),
      logged: Boolean(req.user),
      antixss,
      antixsslinks
    })
  });
  // listen for requests :)
  // In this case the requests will be local.
  const listener = app.listen(process.env.PORT, () => {
    console.log("Your app is listening on port " + listener.address().port);
  });
  if (process.argv[2] === "ci") {
    setTimeout(process.exit, 15000)
  }
})().catch(err => {
  console.log(err);
  process.exit(1);
});
