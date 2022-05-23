const express = require("express");

const router = require("./api.js");

const app = express();

const port = 9000;
const env = process.env.NODE_ENV || "development";

// Serve static files from the React app
if (env === "production") {
  app.get("*", function (req, res, next) {
    if (req.header("x-forwarded-proto") !== "https") {
      res.redirect(`https://${req.header("host")}${req.url}`);
    } else {
      next();
    }
  });
  app.use(express.static(path.resolve(__dirname, "../../client/build")));
  app.use("/api", router);
  app.get("*", function (req, res, next) {
    res.sendFile(path.join(__dirname, "../../client/build", "index.html"));
  });
} else {
  app.use("/api", router);
}

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
