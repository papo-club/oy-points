import React, { useEffect, useState } from "react";
import { useParams } from "react-router";

const ResultsPage = () => {
  const [points, setPoints] = useState(null);
  const [season, setSeasons] = useState(null);
  const [grades, setGrades] = useState(null);
  const [events, setEvents] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [derivation, setDerivation] = useState(null);
  const [receivedResponse, setReceivedResponse] = useState(false);
  const { year } = useParams();
  const derivationColors = {
    WIN: "bg-green-100",
    PLAN: "bg-yellow-100",
    CTRL: "bg-yellow-100",
  };
  useEffect(() => {
    const api = "http://localhost:9000/";
    const endpoints = [
      ["points", setPoints],
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
    Promise.resolve(
      fetch(api + "grades")
        .then((res) => res.json())
        .then(setGrades)
    );
    Promise.all(promises).then(() => setReceivedResponse(true));
  }, [year]);

  const content = (receivedResponse) => {
    console.log(receivedResponse);
    switch (receivedResponse) {
      case true:
        return (
          <>
            <h2>Points derivation legend</h2>
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
            </table>
            {Object.entries(points)
              .sort(
                ([gradea], [gradeb]) =>
                  grades[gradeb].difficulty - grades[gradea].difficulty
              )
              .map(([grade, competitors]) => (
                <>
                  <h1 className="font-title font-bold text-4xl">
                    {grades[grade].name}
                  </h1>
                  <table className="table-auto w-full">
                    <thead>
                      <th className="w-14">Place</th>
                      <th className="w-72">Competitor</th>
                      {Object.entries(events).map(([idevent, event_]) => (
                        <th className="-rotate-45 w-20">
                          <div className="whitespace-nowrap h-12 translate-y-10  translate-x-24 w-0">
                            <span className="text-left">
                              OY{idevent} {event_.name} <br />
                              <span className="border-b">
                                {event_.discipline}
                              </span>
                            </span>
                          </div>
                        </th>
                      ))}
                      <th className="w-14">Total /{25 * 5}</th>
                    </thead>
                    <tbody>
                      {console.log()}
                      {Object.entries(competitors)
                        .sort(
                          ([, a], [, b]) =>
                            (b.qualified !== "INEL") -
                              (a.qualified !== "INEL") ||
                            b.totalPoints - a.totalPoints
                        )
                        .map(([idcompetitor, competitor], place) => (
                          <tr>
                            <th
                              className={` ${
                                competitor.qualified !== "INEL"
                                  ? "fw-bold"
                                  : "text-muted fst-italic"
                              }`}
                            >
                              {competitor.qualified !== "INEL"
                                ? place + 1
                                : `(${place + 1})`}
                            </th>
                            <th
                              className={` ${
                                competitor.qualified !== "INEL" || "text-muted"
                              }`}
                            >
                              <div>{`${competitor.firstName} ${competitor.lastName}`}</div>
                              <div>
                                {eligibility[competitor.qualified].name}
                              </div>
                            </th>
                            {Object.entries(events).map(([idevent, event_]) => (
                              <td
                                className={
                                  competitor.results[idevent]
                                    ?.countsTowardsTotal &&
                                  competitor.qualified !== "INEL"
                                    ? derivationColors[
                                        competitor.results[idevent]?.derivation
                                      ] + " fw-bold border"
                                    : derivationColors[
                                        competitor.results[idevent]?.derivation
                                      ] + " text-muted border"
                                }
                              >
                                {competitor.results[idevent]?.points}
                                <br />
                                {competitor.results[idevent]?.derivation}
                              </td>
                            ))}
                            <th
                              className={
                                competitor.qualified !== "INEL"
                                  ? "font-bold"
                                  : "gray-300"
                              }
                            >
                              {competitor.totalPoints}
                            </th>
                          </tr>
                        ))}
                    </tbody>
                  </table>
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
