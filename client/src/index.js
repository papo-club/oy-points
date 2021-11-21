import "bootstrap/dist/css/bootstrap.min.css";
import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Table from "react-bootstrap/Table";
import ReactDOM from "react-dom";

function App() {
  const [points, setPoints] = useState(null);
  const [grades, setGrades] = useState(null);
  const [events, setEvents] = useState(null);
  const [receivedResponse, setReceivedResponse] = useState(false);
  const derivationColors = {
    WIN: "table-success",
    PLAN: "table-warning",
    CTRL: "table-warning",
  };
  useEffect(() => {
    const api = "http://localhost:9000/";
    const endpoints = [
      ["points", setPoints],
      ["grades", setGrades],
      ["events", setEvents],
    ];
    const promises = endpoints.map(([endpoint, setter]) => {
      return fetch(api + endpoint)
        .then((res) => res.json())
        .then((json) => setter(json));
    });
    Promise.all(promises).then(() => setReceivedResponse(true));
  }, []);
  const content = (receivedResponse) => {
    switch (receivedResponse) {
      case true:
        return Object.entries(points).map(([grade, competitors]) => (
          <>
            <h1>{grades[grade].name}</h1>
            <Table>
              <thead className="thead-light">
                <th>Place</th>
                <th>Competitor</th>
                {Object.entries(events).map(([idevent, event_]) => (
                  <th style={{ width: "10%" }}>
                    OY{idevent}
                    <br />
                    {event_.name}
                    <br />
                    {event_.discipline}
                  </th>
                ))}
                <th>Total /{25 * 5}</th>
              </thead>
              <tbody>
                {console.log()}
                {Object.entries(competitors)
                  .sort(
                    ([, a], [, b]) =>
                      (b.qualified != "INEL") - (a.qualified != "INEL") ||
                      b.totalPoints - a.totalPoints
                  )
                  .map(([idcompetitor, competitor], index) => (
                    <tr>
                      <th
                        className={`table-active ${
                          competitor.qualified != "INEL"
                            ? "fw-bold"
                            : "text-muted fst-italic"
                        }`}
                      >
                        {competitor.qualified ? index + 1 : 0}
                      </th>
                      <th
                        className={`table-active ${
                          competitor.qualified != "INEL" || "text-muted"
                        }`}
                      >
                        <div>{`${competitor.firstName} ${competitor.lastName}`}</div>
                        <div>{competitor.qualified}</div>
                      </th>
                      {Object.entries(events).map(([idevent, event_]) => (
                        <td
                          className={
                            competitor.results[idevent]?.countsTowardsTotal &&
                            competitor.qualified != "INEL"
                              ? derivationColors[
                                  competitor.results[idevent]?.derivation
                                ] + " fw-bold"
                              : derivationColors[
                                  competitor.results[idevent]?.derivation
                                ] + " text-muted"
                          }
                        >
                          {competitor.results[idevent]?.points}
                          <br />
                          {competitor.results[idevent]?.derivation}
                        </td>
                      ))}
                      <td
                        className={`table-active ${
                          competitor.qualified != "INEL"
                            ? "fw-bold"
                            : "text-muted"
                        }`}
                      >
                        {competitor.totalPoints}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </>
        ));
      case false:
        return <>Loading...</>;
      default:
        return <h1>Sorry, an error occurred</h1>;
    }
  };
  return <Container className="pt-4">{content(receivedResponse)}</Container>;
}

export default App;

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
