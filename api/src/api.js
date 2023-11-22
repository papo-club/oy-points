const express = require("express");
const router = express.Router();
const { asyncQuery, queryToObject } = require("./orm.js");

MIN_EVENTS_TO_QUALIFY = 3;

const getPoints = async (season) => {
  const rows = await asyncQuery(
    `SELECT * from oypoints.points WHERE year=${season}`
  );

  return rows
    .map((row) => ({
      points: row.points_generated,
      derivation: row.points_derivation_id,
      countsTowardsTotal: Boolean(row.counts_towards_total),
      member: row.member_id,
      event: row.event_number,
    }))
    .sort((a, b) => a.points - b.points);
};

const getEvent = async (season, number) => {
  const rows = await asyncQuery(
    `SELECT * from oypoints.race WHERE year=${season} AND event_number=${number}`
  );
  const name = rows.map((row) => row.map).join(" + ");
  return Promise.all(rows.map((row) => getDiscipline(row.discipline_id))).then(
    (disciplines) => ({
      name: name,
      discipline: disciplines
        .map((discipline) => Object.values(discipline)[0].name)
        .join(" + "),
    })
  );
};

const getEvents = async (season) => {
  const rows = await asyncQuery(
    `SELECT * from oypoints.event WHERE year=${season}`
  );
  res = {};
  return new Promise((resolve, reject) => {
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
  });
};

const getMemberGradeAndEligibility = async (id, season) => {
  const rows = await asyncQuery(
    `SELECT grade_id, eligibility_id from oypoints.member_grade WHERE member_id=${id} AND year=${season}`
  );
  if (rows.length) {
    let row = rows[0];
    return {
      eligibility: row.eligibility_id,
      grade: row.grade_id,
    };
  } else {
    return null;
  }
};

const getSeasons = async (season) => {
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

  if (season) {
    let rows = await asyncQuery(
      `SELECT * from oypoints.season WHERE year=${season}`
    );
    if (rows.length) {
      let row = rows[0];
      return {
        MAX_POINTS: row.max_points,
        MIN_POINTS: row.min_points,
        MIN_TIME_POINTS: row.min_time_points,
        numEvents: row.num_events,
        numEventsCount: countsTowardsTotal[row.num_events],
        numEventsToQualify: MIN_EVENTS_TO_QUALIFY,
        provisional: row.provisional,
        lastEvent: row.last_event,
      };
    } else {
      return null;
    }
  } else {
    rows = await asyncQuery(`SELECT year from oypoints.season`);
    return rows.map((row) => row.year);
  }
};

const getMembers = (season) =>
  queryToObject(
    `SELECT * from oypoints.member WHERE year=${season}`,
    "member_id"
  );

const getGrades = () =>
  queryToObject("SELECT * FROM oypoints.grade", "grade_id");

const getDiscipline = (discipline_id) =>
  queryToObject(
    `SELECT * FROM oypoints.discipline WHERE discipline_id='${discipline_id}'`,
    "discipline_id"
  );

router.get("/", (req, res) => {
  res.send("API Home");
});

[
  { pattern: "/season/:year", param: "year", route: getSeasons },
  { pattern: "/seasons", route: getSeasons },
  { pattern: "/members/:year", param: "year", route: getMembers },
  { pattern: "/grades", route: getGrades },
  { pattern: "/events/:year", param: "year", route: getEvents },
  {
    pattern: "/eligibility",
    route: () =>
      queryToObject("SELECT * from oypoints.eligibility", "eligibility_id"),
  },
  {
    pattern: "/derivation",
    route: () =>
      queryToObject(
        "SELECT * from oypoints.points_derivation",
        "points_derivation_id"
      ),
  },
].forEach(({ pattern, param, route }) =>
  router.get(pattern, (req, res) => {
    if (param) {
      route(req.params[param]).then((json) => res.send(json));
    } else {
      route().then((json) => res.send(json));
    }
  })
);

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
                  projectedTotal: {},
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
                      return_result[grade_id][member_id].projectedTotal[
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
