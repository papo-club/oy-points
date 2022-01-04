const express = require("express");
const cors = require("cors");
const mysql = require("mysql");

const app = express();
app.use(cors());
const port = 9000;

var connection = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "root",
  database: "oypoints",
});

connection.connect();

const MIN_EVENTS_TO_QUALIFY = 3;
const BEST_X_SCORES = 4;

const getMembers = (season) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT * from oypoints.member WHERE year=${season}`,
      (err, rows, fields) => {
        if (err) throw err;
        members = {};
        for (row of rows) {
          members[row.member_id] = {
            lastName: row.last_name,
            firstName: row.first_name,
          };
        }
        resolve(members);
      }
    );
  });
};

const getEligibility = () => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT * from oypoints.eligibility`,
      (err, rows, fields) => {
        if (err) throw err;
        eligibility = {};
        for (row of rows) {
          eligibility[row.eligibility_id] = {
            name: row.type,
          };
        }
        resolve(eligibility);
      }
    );
  });
};

const getDerivation = () => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT * from oypoints.points_derivation`,
      (err, rows, fields) => {
        if (err) throw err;
        derivation = {};
        for (row of rows) {
          derivation[row.points_derivation_id] = {
            name: row.type,
            points: row.points,
            description: row.description,
          };
        }
        resolve(derivation);
      }
    );
  });
};

const getGrades = () => {
  return new Promise((resolve, reject) => {
    connection.query(`SELECT * FROM oypoints.grade`, (err, rows, fields) => {
      if (err) throw err;
      grades = {};
      rows.forEach((row) => {
        grades[row.grade_id] = {
          name: row.name,
          gender: row.gender,
          difficulty: row.difficulty,
        };
      });
      resolve(grades);
    });
  });
};

const getPoints = (season) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT * from oypoints.points WHERE year=${season}`,
      (err, rows, fields) => {
        if (err) throw err;
        resolve(
          rows
            .map((row) => ({
              points: row.points_generated,
              derivation: row.points_derivation_id,
              countsTowardsTotal: Boolean(row.counts_towards_total),
              member: row.member_id,
              event: row.event_number,
            }))
            .sort((a, b) => a.points - b.points)
        );
      }
    );
  });
};

const getEvent = (season, number) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT * from oypoints.race WHERE year=${season} AND event_number=${number}`,
      (err, rows, fields) => {
        if (err) throw err;
        resolve({
          name: rows.map((row) => row.map).join(" + "),
          discipline: rows.map((row) => row.discipline_id).join(" + "),
        });
      }
    );
  });
};

const getEvents = (season) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT * from oypoints.event WHERE year=${season}`,
      (err, rows, fields) => {
        if (err) throw err;
        res = {};
        Promise.all(rows.map((row) => getEvent(season, row.number))).then(
          (events) => {
            rows.forEach(
              (_event, index) =>
                (res[_event.number] = {
                  name: events[index].name,
                  discipline: events[index].discipline,
                  date: _event.date,
                })
            );
            resolve(res);
          }
        );
      }
    );
  });
};

const getMemberGradeAndEligibility = (id, season) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT grade_id, eligibility_id from oypoints.member_grade WHERE member_id=${id} AND year=${season}`,
      (err, rows, fields) => {
        if (err) throw err;
        if (rows.length) {
          let row = rows[0];
          resolve({
            eligibility: row.eligibility_id,
            grade: row.grade_id,
          });
        } else {
          resolve(null);
        }
      }
    );
  });
};

const getSeasons = (season) => {
  return new Promise((resolve, reject) => {
    if (season) {
      connection.query(
        `SELECT * from oypoints.season WHERE year=${season}`,
        (err, rows, fields) => {
          if (rows.length) {
            let row = rows[0];
            resolve({
              MAX_POINTS: row.max_points,
              MIN_POINTS: row.min_points,
              MIN_TIME_POINTS: row.min_time_points,
              provisional: row.provisional,
            });
          } else {
            resolve(null);
          }
        }
      );
    } else {
      connection.query(`SELECT * from oypoints.season`, (err, rows, fields) => {
        if (err) throw err;
        seasons = {};
        for (row of rows) {
          seasons[row.year] = {
            MAX_POINTS: row.max_points,
            MIN_POINTS: row.min_points,
            MIN_TIME_POINTS: row.min_time_points,
            provisional: row.provisional,
          };
        }
        resolve(seasons);
      });
    }
  });
};

app.get("/", (req, res) => {
  res.send("API Home");
});

app.get("/seasons/:year?", (req, res) => {
  getSeasons(req.params.year).then((seasons) => res.send(seasons));
});

app.get("/members/:year", (req, res) => {
  getMembers(req.params.year).then((members) => res.send(members));
});

app.get("/grades", (req, res) => {
  getGrades().then((grades) => res.send(grades));
});

app.get("/events/:year", (req, res) => {
  getEvents(req.params.year).then((events) => res.send(events));
});

app.get("/eligibility/:year", (req, res) => {
  getEligibility(req.params.year).then((eligibility) => res.send(eligibility));
});

app.get("/derivation/:year", (req, res) => {
  getDerivation(req.params.year).then((derivation) => res.send(derivation));
});

app.get("/points/:year/:grade?", (req, res) => {
  getGrades(req.params.year)
    .then((grades) => {
      return Object.fromEntries(
        Object.keys(grades).map((grade) => [grade, {}])
      );
    })
    .then((return_result) => {
      getMembers(req.params.year).then((members) => {
        let membersWithGrades = Object.entries(members).map(([id, member]) => {
          return getMemberGradeAndEligibility(id, req.params.year).then(
            (memberStatus) => {
              if (memberStatus) {
                return_result[memberStatus["grade"]][id] = {
                  ...member,
                  // totalPoints: totalPoints.toFixed(2),
                  qualified: memberStatus["eligibility"],
                  results: {},
                };
              }
            }
          );
        });
        Promise.all(membersWithGrades)
          .then(() => getPoints(req.params.year))
          .then((points) => {
            Promise.all(
              points.map((point) => {
                return getEvent(req.params.year, point.event).then((_event) => {
                  return getMemberGradeAndEligibility(
                    point.member,
                    req.params.year
                  ).then((memberStatus) => {
                    if (return_result[memberStatus["grade"]][point.member]) {
                      return_result[memberStatus["grade"]][
                        point.member
                      ].results[point.event] = {
                        derivation: point.derivation,
                        points: point.points,
                        countsTowardsTotal: point.countsTowardsTotal,
                      };
                    }
                  });
                });
              })
            )
              .then(() => {
                Object.entries(return_result).map(([grade_id, members]) =>
                  Object.entries(members).map(([member_id, member]) => {
                    const totalPoints = Object.entries(member.results).reduce(
                      (acc, [idevent, _event]) =>
                        return_result[grade_id][member_id].results[idevent]
                          .countsTowardsTotal
                          ? acc + _event.points
                          : acc,
                      0
                    );
                    return_result[grade_id][member_id].totalPoints =
                      +totalPoints.toFixed(2);
                  })
                );
              })
              .then(() => {
                if (req.params.grade) {
                  res.send(return_result[req.params.grade]);
                } else {
                  res.send(return_result);
                }
              });
          });
      });
    });
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
