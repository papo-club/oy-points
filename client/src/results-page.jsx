import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { LineChart, XAxis, YAxis, CartesianGrid, Line, Legend } from "recharts";

const ResultsPage = () => {
  const [points, setPoints] = useState(null);
  const [season, setSeasons] = useState(null);
  const [grades, setGrades] = useState(null);
  const [events, setEvents] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [derivation, setDerivation] = useState(null);
  const [receivedResponse, setReceivedResponse] = useState(false);
  const { year, grade } = useParams();
  const derivationColors = {
    WIN: "bg-green-100",
    PLAN: "bg-yellow-100",
    CTRL: "bg-yellow-100",
  };

  const colours = [
    "#e60049",
    "#0bb4ff",
    "#50e991",
    "#e6d800",
    "#9b19f5",
    "#ffa300",
    "#dc0ab4",
    "#b3d4ff",
    "#00bfa0",
    "#555555",
  ];

  const topX = 10;

  const getAverages = (idevent, competitors) => {
    let result = {};
    Object.entries(competitors)
      .sort(competitorSort)
      .filter(([, competitor]) => competitor.qualified !== "INEL")
      .slice(0, topX)
      .sort(([, a], [, b]) => b.projectedAvg[idevent] - a.projectedAvg[idevent])
      .map(([idcompetitor, projectedAvg], index) => {
        result[idcompetitor] = index + 1;
      });
    return result;
  };

  const competitorSort = ([, a], [, b]) =>
    (b.qualified !== "INEL") - (a.qualified !== "INEL") ||
    (season.provisional
      ? b.projectedAvg[season.lastEvent] - a.projectedAvg[season.lastEvent]
      : b.totalPoints[season.numEvents] - a.totalPoints[season.numEvents]);

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
      fetch(api + "points" + "/" + (grade ? year + "/" + grade : year))
        .then((res) => res.json())
        .then((points) => (grade ? { [grade]: points } : points))
        .then(setPoints)
    );
    promises.push(
      fetch(api + "grades")
        .then((res) => res.json())
        .then(setGrades)
    );
    Promise.all(promises).then(() => setReceivedResponse(true));
  }, [year, grade]);

  const content = (receivedResponse) => {
    switch (receivedResponse) {
      case true:
        return (
          <>
            {/* <h2>Points derivation legend</h2>
            <table>
              <thead className="thead-light">
                <th>Code</th>
                <th>Points</th>
                <th>Name</th>
                <th>Description</th>
              </thead>
              <tbody>
                {Object.entries(derivation).map(
                  ([idderivation, derivation]) => (
                    <tr>
                      <th className="table-active">{idderivation}</th>
                      <td>
                        {season[derivation.points] ||
                          derivation.points ||
                          (derivation.name !== "OK" &&
                            `${season["MAX_POINTS"]} - ? `) ||
                          `${season["MIN_TIME_POINTS"]} - ${season["MAX_POINTS"]}`}
                      </td>
                      <td>{derivation.name}</td>
                      <td>{derivation.description}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table> */}
            {Object.entries(points)
              .sort(
                ([gradea], [gradeb]) =>
                  grades[gradeb].difficulty - grades[gradea].difficulty
              )
              .map(([grade, competitors]) => (
                <>
                  <div className="flex flex-col max-w-screen-xl px-5 m-auto my-10">
                    <div className="self-center lg:self-start">
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
                    <div className="mt-5 relative overflow-auto lg:overflow-visible whitespace-nowrap">
                      <table className="w-full border-collapse">
                        <thead>
                          <th className="sticky w-2 text-right border-b">
                            {season.provisional ? "Current Placing" : "Place"}
                          </th>
                          <th className="sticky w-40 text-left pl-4 border-b">
                            Competitor
                          </th>
                          {Object.entries(events).map(([idevent, event_]) => (
                            <>
                              <th className="hidden lg:table-cell relative whitespace-nowrap rotated-header">
                                <div className="absolute bottom-0 left-0 text-left w-full">
                                  <div className="absolute bottom-0 left-0 border-b overflow-hidden text-ellipsis">
                                    OY{idevent} - {event_.name}
                                  </div>
                                </div>
                              </th>
                              <th className="lg:hidden">OY{idevent}</th>
                            </>
                          ))}
                          <th className="sticky w-20 text-right pr-3">
                            Points
                          </th>
                          <th className="border-b sticky w-20 text-right pr-3">
                            {season.provisional
                              ? "Projected Avg"
                              : "Performance"}
                          </th>
                        </thead>
                        <tbody>
                          {Object.entries(competitors)
                            .sort(competitorSort)
                            .map(([idcompetitor, competitor], place) => (
                              <tr className="odd:bg-white even:bg-gray-50">
                                <th
                                  className={`sticky text-2xl sm:text-4xl text-right font-title ${
                                    competitor.qualified !== "INEL"
                                      ? "font-bold"
                                      : "font-normal italic text-gray-400"
                                  }`}
                                >
                                  {competitor.qualified !== "INEL"
                                    ? place + 1
                                    : `(${place + 1})`}
                                </th>
                                <th
                                  className={`sticky pl-4 text-sm sm:text-base font-title text-left ${
                                    competitor.qualified !== "INEL" ||
                                    "text-gray-400"
                                  }`}
                                >
                                  <div>{`${competitor.firstName} ${competitor.lastName}`}</div>
                                  <div>
                                    {eligibility[competitor.qualified].name}
                                  </div>
                                </th>
                                {Object.entries(events).map(
                                  ([idevent, event_]) => (
                                    <td
                                      className={
                                        "min-w-20 w-20 border-r border-t p-2 " +
                                        (competitor.results[idevent]
                                          ?.countsTowardsTotal &&
                                        competitor.qualified !== "INEL"
                                          ? derivationColors[
                                              competitor.results[idevent]
                                                ?.derivation
                                            ]
                                          : "text-gray-400 italic")
                                      }
                                    >
                                      <div className="text-2xl font-bold font-title">
                                        {competitor.results[idevent]?.points}
                                      </div>
                                      <div className="-my-1 text-sm ">
                                        {
                                          competitor.results[idevent]
                                            ?.derivation
                                        }
                                      </div>
                                    </td>
                                  )
                                )}
                                <th
                                  className={
                                    "sticky text-2xl border-t min-w-24 sm:text-4xl text-right pr-3 font-title " +
                                    (competitor.qualified !== "INEL"
                                      ? "font-bold"
                                      : "font-normal italic text-gray-400")
                                  }
                                >
                                  {competitor.totalPoints[season.lastEvent]}
                                </th>
                                <th
                                  className={
                                    "sticky text-xl sm:text-3xl text-right pr-3 font-title " +
                                    (competitor.qualified !== "INEL"
                                      ? "font-bold"
                                      : "font-normal italic text-gray-400")
                                  }
                                >
                                  {season.provisional
                                    ? competitor.projectedAvg[season.lastEvent]
                                    : (
                                        (competitor.totalPoints[
                                          season.numEvents
                                        ] *
                                          100) /
                                        (season.MAX_POINTS *
                                          season.numEventsCount)
                                      ).toFixed(0) + "%"}
                                </th>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    <br></br>
                    <LineChart
                      width={1200}
                      height={500}
                      data={Object.entries(events).map(([idevent, event_]) =>
                        getAverages(idevent, competitors)
                      )}
                    >
                      <XAxis dataKey="name" />
                      <YAxis
                        reversed
                        interval="preserveStartEnd"
                        domain={[1, topX]}
                      />
                      <CartesianGrid stroke="#eee" strokeDasharray="1 1" />
                      {Object.entries(competitors)
                        .sort(competitorSort)
                        .filter(
                          ([, competitor]) => competitor.qualified !== "INEL"
                        )
                        .slice(0, topX)
                        .map(([idcompetitor, competitor], index) => (
                          <Line
                            name={`${competitor.firstName} ${competitor.lastName}`}
                            type="monotone"
                            strokeWidth={4}
                            dataKey={idcompetitor}
                            stroke={colours[index]}
                          />
                        ))}
                      <Legend />
                    </LineChart>
                  </div>
                </>
              ))}
          </>
        );
      case false:
        return <>Loading...</>;
      default:
        return <h1>Sorry, an error occurred</h1>;
    }
  };
  return content(receivedResponse);
};

export default ResultsPage;
