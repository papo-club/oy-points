import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Chart from "../components/Chart";
import PapoLogo from "../images/papo-logo.png";
import PointsDerivationTable from "../components/PointsDerivationTable";
import PointsTable from "../components/PointsTable";

const ordinal = require("ordinal");
const getPlacings = ([idevent], topXCompetitors) => {
  let result = {};
  topXCompetitors
    .sort(([, a], [, b]) => b.projectedAvg[idevent] - a.projectedAvg[idevent])
    .forEach(([idcompetitor], index) => (result[idcompetitor] = index + 1));
  result.event = "OY" + idevent;
  return result;
};

const getTotalPoints = ([idevent], topXCompetitors) => {
  let result = {};
  topXCompetitors.forEach(
    ([idcompetitor, competitor]) =>
      (result[idcompetitor] = idevent > 0 ? competitor.totalPoints[idevent] : 0)
  );
  if (idevent > 0) result.event = "OY" + idevent;
  return result;
};

const ResultsPage = () => {
  const [points, setPoints] = useState(null);
  const [season, setSeasons] = useState(null);
  const [grades, setGrades] = useState(null);
  const [events, setEvents] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [derivation, setDerivation] = useState(null);
  const [subpage, setSubpage] = useState(false);
  const { year, grade } = useParams();

  useEffect(() => {
    const api = "http://localhost:9000/";
    const endpoints = [
      ["seasons", setSeasons],
      ["events", setEvents],
      ["eligibility", setEligibility],
      ["derivation", setDerivation],
    ];
    const promises = endpoints.map(([endpoint, setter]) => {
      return fetch(api + endpoint + "/" + year)
        .then((res) => res.json())
        .then(setter);
    });
    promises.push(
      fetch(api + "points" + "/" + year + "/" + grade)
        .then((res) => res.json())
        .then(setPoints)
    );
    promises.push(
      fetch(api + "grades")
        .then((res) => res.json())
        .then(setGrades)
    );
    Promise.all(promises).then(() => setSubpage("points"));
  }, [year, grade]);

  const content = () => {
    const sortedCompetitors = Array.from(
      new Map(
        Object.entries(points).sort(
          ([, a], [, b]) =>
            (b.qualified !== "INEL") - (a.qualified !== "INEL") ||
            (season.provisional
              ? b.projectedAvg[season.lastEvent] -
                a.projectedAvg[season.lastEvent]
              : b.totalPoints[season.numEvents] -
                a.totalPoints[season.numEvents])
        )
      ).entries()
    );
    const Subpage = ({ subpage }) => {
      switch (subpage) {
        case "points":
          return (
            <PointsTable
              season={season}
              competitors={sortedCompetitors}
              events={events}
              eligibility={eligibility}
            />
          );
        case "stats":
          return (
            <>
              <h1 className="text-xl sm:text-3xl mt-5 pl-2 mb-4 font-title text-center font-semibold sm:font-normal">
                Projected placing by event
              </h1>
              <Chart
                forEachEvent={getPlacings}
                competitors={sortedCompetitors}
                reversed
                tickFormatter={ordinal}
                events={events}
              />
              <h1 className="text-xl sm:text-3xl mt-10 pl-2 mb-4 font-title text-center font-semibold sm:font-normal">
                Total points by event
              </h1>
              <Chart
                forEachEvent={getTotalPoints}
                competitors={sortedCompetitors}
                domain={[0, season.MAX_POINTS * season.numEventsCount]}
                events={{ 0: {}, ...events }}
              />
            </>
          );
        case "help":
          return (
            <div className="max-w-screen-lg">
              <h1 className="text-xl sm:text-3xl mt-5 mb-4 font-title font-semibold sm:font-normal">
                How are OY points calculated?
              </h1>
              <p>
                After each OY event, the winner of each grade recieves{" "}
                {season.MAX_POINTS} points. Every other competitor in the grade
                recieves scaled points based on how their time compares to the
                winning time. A baseline minimum of {season.MIN_TIME_POINTS}{" "}
                points can be awarded this way, so even if the scaled points are
                lower than this, at least {season.MIN_TIME_POINTS} are
                guaranteed. As well as the winner, the event organisers gain{" "}
                {season.MAX_POINTS} points for the event. However, a competitor
                can only gain points in this way once per season. A maximum of{" "}
                {season.numEventsCount} of the {season.numEvents} events will
                count towards the {year} season, so if a competitor has results
                in more events than this, the best {season.numEventsCount}{" "}
                results will count towards their total score.
              </p>
              <h1 className="text-xl sm:text-3xl mt-10 mb-4 font-title font-semibold sm:font-normal">
                How is my OY grade calculated?
              </h1>
              <p>
                Your OY grade is calculated based on the grade you have most
                commonly raced in for the {year} season. If you have raced in
                multiple grades equally, the more 'difficult' grade is always
                chosen. If you have only raced in an event without standard OY
                grades (such as a score event), you will be placed in the most
                'difficult' OY grade that is associated with that event (e.g.
                Long Red) until you have raced in a standard OY event and your
                grade can be correctly assumed.
              </p>
              {season.provisional ? (
                <>
                  <h1 className="text-xl sm:text-3xl mt-10 mb-4 font-title font-semibold sm:font-normal">
                    How are provisional placings determined throughout the
                    season?
                  </h1>
                  <p>
                    Current placings are determined using the 'projected
                    average' score. This score is calculated by multiplying the
                    competitor's average score for each event by the amount of
                    events still to go in the season. This enables a fairer
                    comparison between competitors when some have competed in
                    more events than others. As the season progresses, the
                    projected average score will get closer and closer to the
                    final score for each competitor, so placings are more likely
                    to change near the beginning of the season than at the end.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-xl sm:text-3xl mt-10 mb-4 font-title font-semibold sm:font-normal">
                    What is the 'performance score'?
                  </h1>
                  <p>
                    The performance score is a measure of how close a
                    competitor's final score was to the 'superman' or best
                    possible score. For the {year} season the best possible
                    score is {season.numEventsCount * season.MAX_POINTS}. The
                    higher a competitor's performance score, the closer they
                    were to acheiving a perfect season. If the winner of a grade
                    has a lower performance score, this indicates a more
                    competitive season/grade and vice versa.
                  </p>
                </>
              )}
              <h1 className="text-xl sm:text-3xl mt-10 mb-4 font-title font-semibold sm:font-normal">
                How do I become eligible for the {year} season?
              </h1>
              <p>
                Although a maximum of {season.numEventsCount} of the{" "}
                {season.numEvents} count towards the {year} season, only{" "}
                {season.numEventsToQualify} events are needed to be eligible for
                the OY competition. Once a competitor has run{" "}
                {season.numEventsToQualify} events, their status will be updated
                from 'Pending' to 'Qualified'.
              </p>
              <h1 className="text-xl sm:text-3xl mt-10 mb-4 font-title font-semibold sm:font-normal">
                What happens if I mispunch/run up/run down a grade?
              </h1>
              <p>
                There are several different scenarios where your race time may
                not have 'OK' status and you may not receive your scaled points
                out of {season.MAX_POINTS}. These scenarios for the {year}{" "}
                season are described below, along with the amount of points you
                will receive if each scenario occurs. Note that the amount of
                points awarded may change based on each season, the below table
                shows the {year} season.
              </p>
              <h1 className="text-xl sm:text-3xl mt-10 mb-4 font-title font-semibold sm:font-normal">
                What do all the codes mean?
              </h1>
              <PointsDerivationTable derivation={derivation} season={season} />
              <h1 className="text-xl sm:text-3xl mt-10 mb-4 font-title font-semibold sm:font-normal">
                How are score (rogaine) OY points calculated?
              </h1>
              <p>
                Check the{" "}
                <a
                  className="text-blue-600"
                  href="https://papo.org.nz/assets/Uploads/OY-rules-2021-update.pdf"
                >
                  official OY rules
                </a>{" "}
                for more detailed information on how OY points are calculated,
                including points calculation rules for score and double sprint
                events.
              </p>
            </div>
          );
      }
    };
    const NavbarButton = ({ id, name }) => (
      <button
        className={` font-title text-xl capitalize hover:text-red-700 ${
          subpage === id ? "text-red-700 font-bold" : "font-semibold"
        }`}
        onClick={() => setSubpage(id)}
      >
        {name ? name : id}
      </button>
    );
    return (
      <>
        <div className="flex flex-col gap-4 max-w-screen-xl px-5 m-auto my-10">
          <div className="self-center lg:self-start">
            <Link to="/">
              <div className="self-center lg:self-start flex flex-row justify-center lg:justify-start lg:ml-1 h-5 mb-5">
                <img src={PapoLogo} />
                <h1 className="text-2xl ml-2 font-title self-center font-bold text-red-700">
                  OY Points
                </h1>
              </div>
            </Link>
            <h1 className="hidden lg:inline font-title text-5xl">
              {grades[grade].name
                .split(" ")
                .splice(0, grades[grade].name.split(" ").length - 1)
                .join(" ")}
              <br />
              {grades[grade].name.split(" ").splice(-1)}
            </h1>
            <h1 className="inline lg:hidden font-title text-3xl sm:text-4xl">
              {grades[grade].name}
            </h1>
          </div>
          <div className="self-center lg:self-start flex flex-row gap-5">
            <NavbarButton id="points" />
            <NavbarButton id="stats" />
            <NavbarButton id="help" name="help / info" />
          </div>
          <div>
            <Subpage subpage={subpage} />
          </div>
        </div>
      </>
    );
  };

  switch (subpage) {
    case "points":
    case "stats":
    case "help":
      return content();
    case false:
      return (
        <div className="w-screen h-screen flex flex-row items-center justify-center text-2xl sm:text-4xl text-gray-300 font-title tracking-wider">
          Loading...
        </div>
      );
  }
};

export default ResultsPage;
