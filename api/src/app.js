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

const getMembers = () => {
  return new Promise((resolve, reject) => {
    connection.query("SELECT * from oypoints.member", (err, rows, fields) => {
      if (err) throw err;
      members = {};
      for (row of rows) {
        members[row.idmember] = {
          lastName: row.last_name,
          firstName: row.first_name,
        };
      }
      resolve(members);
    });
  });
};

const getGrades = (season) => {
  return new Promise((resolve, reject) => {
    connection.query(`SELECT * FROM oypoints.grade`, (err, rows, fields) => {
      if (err) throw err;
      grades = {};
      rows.forEach((row) => {
        grades[row.idgrade] = {
          name: row.name,
          gender: row.gender,
        };
      });
      resolve(grades);
    });
  });
};

const getPoints = (season) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT * from oypoints.points WHERE event_season_idyear=${season}`,
      (err, rows, fields) => {
        if (err) throw err;
        resolve(
          rows.map((row) => ({
            points: row.points_generated,
            derivation: row.points_derivation_idpoints_derivation,
            countsTowardsTotal: Boolean(row.counts_towards_total),
            member: row.member_grade_member_idmember,
            event: row.event_number,
          }))
        );
      }
    );
  });
};

const getEvent = (season, number) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT * from oypoints.race WHERE event_season_idyear=${season} AND event_number=${number}`,
      (err, rows, fields) => {
        if (err) throw err;
        resolve({
          name: rows.map((row) => row.map.split(" ")[0]).join(" + "),
          discipline: rows
            .map((row) => row.discipline_iddiscipline)
            .join(" + "),
        });
      }
    );
  });
};

const getEvents = (season) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT * from oypoints.event WHERE season_idyear=${season}`,
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

const getMemberGradeAndEligibility = (id) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT grade_idgrade, eligibility_ideligibility from oypoints.member_grade WHERE member_idmember=${id}`,
      (err, rows, fields) => {
        if (err) throw err;
        if (rows.length) {
          let row = rows[0];
          resolve({
            eligibility: row.eligibility_ideligibility,
            grade: row.grade_idgrade,
          });
        } else {
          resolve(null);
        }
      }
    );
  });
};

app.get("/", (req, res) => {
  res.send("API Home");
});

app.get("/members", (req, res) => {
  getMembers().then((members) => res.send(members));
});

app.get("/grades", (req, res) => {
  getGrades("2021").then((grades) => res.send(grades));
});

app.get("/events", (req, res) => {
  getEvents("2021").then((events) => res.send(events));
});

app.get("/points", (req, res) => {
  getGrades("2021")
    .then((grades) => {
      return Object.fromEntries(
        Object.keys(grades).map((grade) => [grade, {}])
      );
    })
    .then((return_result) => {
      getMembers().then((members) => {
        let membersWithGrades = Object.entries(members).map(([id, member]) => {
          return getMemberGradeAndEligibility(id).then((memberStatus) => {
            if (memberStatus) {
              return_result[memberStatus["grade"]][id] = {
                ...member,
                // totalPoints: totalPoints.toFixed(2),
                qualified: memberStatus["eligibility"],
                results: {},
              };
            }
          });
        });
        Promise.all(membersWithGrades)
          .then(() => getPoints("2021"))
          .then((points) => {
            Promise.all(
              points.map((point) => {
                return getEvent("2021", point.event).then((_event) => {
                  return getMemberGradeAndEligibility(point.member).then(
                    (memberStatus) => {
                      if (return_result[memberStatus["grade"]][point.member]) {
                        return_result[memberStatus["grade"]][
                          point.member
                        ].results[point.event] = {
                          derivation: point.derivation,
                          points: point.points,
                          countsTowardsTotal: point.countsTowardsTotal,
                        };
                      }
                    }
                  );
                });
              })
            )
              .then(() => {
                Object.entries(return_result).map(([idgrade, members]) =>
                  Object.entries(members).map(([idmember, member]) => {
                    const totalPoints = Object.entries(member.results).reduce(
                      (acc, [idevent, _event]) =>
                        return_result[idgrade][idmember].results[idevent]
                          .countsTowardsTotal
                          ? acc + _event.points
                          : acc,
                      0
                    );
                    return_result[idgrade][idmember].totalPoints =
                      +totalPoints.toFixed(2);
                  })
                );
              })
              .then(() => res.send(return_result));
          });
      });
    });
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
