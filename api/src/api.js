const express = require("express");
const mysql = require("mysql");
const router = express.Router();
const fs = require('fs');

let password = process.env.MYSQL_PASSWORD || "root";
if (process.env.MYSQL_PASSWORD && process.env.MYSQL_PASSWORD.startsWith("/run/secrets")) {
  password = fs.readFileSync(process.env.MYSQL_PASSWORD, {encoding: 'utf8'}).trim();
}

var connection = mysql.createConnection({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  user: process.env.MYSQL_USER || "root",
  password: password,
  database: process.env.MYSQL_DB || "oypoints",
});

connection.connect();

MIN_EVENTS_TO_QUALIFY = 3;

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
  const countsTowardsTotal = {
    1: 1,
    2: 1,
    3: 2,
    4: 3,
    5: 4,
    6: 4,
    7: 5,
    8: 5,
  };

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
              numEvents: row.num_events,
              numEventsCount: countsTowardsTotal[row.num_events],
              numEventsToQualify: MIN_EVENTS_TO_QUALIFY,
              provisional: row.provisional,
              lastEvent: row.last_event,
            });
          } else {
            resolve(null);
          }
        }
      );
    } else {
      connection.query(
        `SELECT year from oypoints.season`,
        (err, rows, fields) => {
          if (err) throw err;
          resolve(rows.map((row) => row.year));
        }
      );
    }
  });
};

router.get("/", (req, res) => {
  res.send("API Home");
});

router.get("/season/:year", (req, res) => {
  getSeasons(req.params.year).then((seasons) => res.send(seasons));
});

router.get("/seasons", (req, res) => {
  getSeasons().then((seasons) => res.send(seasons));
});

router.get("/members/:year", (req, res) => {
  getMembers(req.params.year).then((members) => res.send(members));
});

router.get("/grades", (req, res) => {
  getGrades().then((grades) => res.send(grades));
});

router.get("/events/:year", (req, res) => {
  getEvents(req.params.year).then((events) => res.send(events));
});

router.get("/eligibility", (req, res) => {
  getEligibility().then((eligibility) => res.send(eligibility));
});

router.get("/derivation", (req, res) => {
  getDerivation().then((derivation) => res.send(derivation));
});

router.get("/points/:year/:grade?", (req, res) => {
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
                  totalPoints: {},
                  projectedAvg: {},
                };
              }
            }
          );
        });
        Promise.all(membersWithGrades)
          .then(() =>
            Promise.all([
              getSeasons(req.params.year),
              getPoints(req.params.year),
              getEvents(req.params.year),
            ])
          )
          .then(([season, points, events]) => {
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
                pastEvents = Object.entries(events).filter(
                  ([idevent, event_]) => idevent <= season.lastEvent
                );
                eventsToGo = season.numEvents - pastEvents.length;
                for (let [currentidevent, currentevent_] of pastEvents) {
                  Object.entries(return_result).map(([grade_id, members]) =>
                    Object.entries(members).map(([member_id, member]) => {
                      let [totalPoints, eventsCompeted] = Object.entries(
                        member.results
                      )
                        .filter(
                          ([idevent, _event]) => idevent <= currentidevent
                        )
                        .reduce(
                          ([points, number], [idevent, _event]) =>
                            return_result[grade_id][member_id].results[idevent]
                              .countsTowardsTotal
                              ? [points + _event.points, number + 1]
                              : [points, number],
                          [0, 0]
                        );
                      return_result[grade_id][member_id].totalPoints[
                        currentidevent
                      ] = +totalPoints.toFixed(2);
                      return_result[grade_id][member_id].projectedAvg[
                        currentidevent
                      ] = +(
                        (totalPoints / eventsCompeted) *
                        Math.min(
                          eventsCompeted + (season.numEvents - currentidevent),
                          season.numEventsCount
                        )
                      ).toFixed(1);
                    })
                  );
                }
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

module.exports = router;
