const express = require("express");
const cors = require("cors");
const mysql = require("mysql");

const app = express();
app.use(cors());
const port = 9000;

var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "oypoints",
});

connection.connect();

const MIN_EVENTS_TO_QUALIFY = 4;

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
    connection.query(
      `SELECT * FROM oypoints.grade WHERE season_idyear=${season}`,
      (err, rows, fields) => {
        if (err) throw err;
        grades = {};
        rows.forEach((row) => {
          grades[row.idgrade] = {
            name: row.name,
            gender: row.gender,
          };
        });
        resolve(grades);
      }
    );
  });
};

const getPoints = (season) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT * from oypoints.points WHERE result_grade_season_idyear=${season}`,
      (err, rows, fields) => {
        if (err) throw err;
        resolve(
          rows.map((row) => ({
            points: row.points_generated,
            member: row.result_member_idmember,
            event: row.result_event_number,
            grade: row.result_grade_idgrade,
          }))
        );
      }
    );
  });
};

const getEvent = (season, number) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT * from oypoints.event WHERE season_idyear=${season} AND number=${number}`,
      (err, rows, fields) => {
        if (err) throw err;
        let row = rows[0];
        resolve({
          name: row.name,
          date: row.date,
          discipline: row.discipline,
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
        events = {};
        rows.forEach(
          (row) =>
            (events[row.number] = {
              name: row.name,
              date: row.date,
              discipline: row.discipline_iddiscipline,
            })
        );
        resolve(events);
      }
    );
  });
};

const getMemberGrade = (id) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT grade_idgrade from oypoints.result WHERE member_idmember=${id}`,
      (err, rows, fields) => {
        if (err) throw err;
        grades = [];
        for (let row of rows) {
          grades.push(row.grade_idgrade);
        }
        if (grades.length) {
          resolve(
            grades
              .sort(
                (a, b) =>
                  grades.filter((v) => v === a).length -
                  grades.filter((v) => v === b).length
              )
              .pop()
          );
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
  getGrades("2020").then((grades) => res.send(grades));
});

app.get("/events", (req, res) => {
  getEvents("2020").then((events) => res.send(events));
});

app.get("/points", (req, res) => {
  getGrades("2020")
    .then((grades) => {
      return Object.fromEntries(
        Object.keys(grades).map((grade) => [grade, {}])
      );
    })
    .then((points) => {
      getMembers().then((members) => {
        let membersWithGrades = Object.entries(members).map(([id, member]) => {
          return getMemberGrade(id).then((grade) => {
            if (grade) {
              points[grade][id] = { ...member, results: {} };
            }
          });
        });
        Promise.all(membersWithGrades)
          .then(() => getPoints("2020"))
          .then((results) => {
            Promise.all(
              results.map((result) => {
                return getEvent("2020", result.event).then((_event) => {
                  if (points[result.grade][result.member]) {
                    points[result.grade][result.member].results[result.event] =
                      {
                        // event: _event,
                        points: result.points,
                      };
                  }
                });
              })
            )
              .then(() => {
                Object.entries(points).map(([grade, members]) =>
                  Object.entries(members).map(([idmember, member]) => {
                    const allPoints = Object.values(member.results)
                      .map((_event) => _event.points)
                      .sort();
                    points[grade][idmember].qualified = true;
                    const totalPoints = Object.entries(member.results).reduce(
                      (acc, [idevent, _event]) => {
                        if (
                          Object.keys(points[grade][idmember].results).length <
                          MIN_EVENTS_TO_QUALIFY
                        ) {
                          points[grade][idmember].results[
                            idevent
                          ].qualified = false;
                          points[grade][idmember].qualified = false;
                          return acc + _event.points;
                        } else if (
                          allPoints.indexOf(_event.points) <
                          Object.keys(points[grade][idmember].results).length -
                            MIN_EVENTS_TO_QUALIFY
                        ) {
                          points[grade][idmember].results[
                            idevent
                          ].qualified = false;
                          return acc;
                        } else {
                          points[grade][idmember].results[
                            idevent
                          ].qualified = true;
                          return acc + _event.points;
                        }
                      },
                      0
                    );
                    points[grade][idmember].totalPoints =
                      +totalPoints.toFixed(2);
                  })
                );
              })
              .then(() => res.send(points));
          });
      });
    });
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
