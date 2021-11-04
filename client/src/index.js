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
                  <th>{event_.name}</th>
                ))}
                <th>Total</th>
              </thead>
              <tbody>
                {console.log()}
                {Object.entries(competitors)
                  .sort(
                    (
                      [idcompetitora, competitora],
                      [idcompetitorb, competitorb]
                    ) => competitorb.totalPoints - competitora.totalPoints
                  )
                  .map(([idcompetitor, competitor], index) => (
                    <tr>
                      <th className="table-active">{index + 1}</th>
                      <th className="table-active">{`${competitor.firstName} ${competitor.lastName}`}</th>
                      {Object.entries(events).map(([idevent, event_]) => (
                        <td>{competitor.results[idevent]?.points}</td>
                      ))}
                      <td>{competitor.totalPoints}</td>
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
