const mysql = require("mysql");
const fs = require("fs");

const password = process.env.MYSQL_PASSWORD
  ? fs.readFileSync(process.env.MYSQL_PASSWORD, { encoding: "utf8" }).trim()
  : "root";

var connection = mysql.createConnection({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  user: process.env.MYSQL_USER || "root",
  password: password,
  database: "oypoints",
});

connection.connect();

const asyncQuery = (query) => {
  return new Promise((resolve, reject) => {
    connection.query(query, (err, results, fields) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

const queryToObject = async (query, pkey) => {
  const rows = await asyncQuery(query);
  result = {};
  rows.forEach((row) => {
    resultData = {};
    Object.entries(JSON.parse(JSON.stringify(row))).forEach(([key, value]) => {
      if (key != pkey) {
        camelKey = key.replace(/([-_][a-z])/gi, ($1) => {
          return $1.toUpperCase().replace("-", "").replace("_", "");
        });
        resultData[camelKey] = value;
      }
    });
    result[row[pkey]] = resultData;
  });
  return result;
};

module.exports = { queryToObject, asyncQuery };
