import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./home-page";
import "./index.css";
import ResultsPage from "./results-page";

const App = () => {
  const [receivedResponse, setReceivedResponse] = useState(false);
  const [seasons, setSeasons] = useState(null);

  useEffect(() => {
    const api = "http://localhost:9000/";
    const endpoints = [["seasons", setSeasons]];
    const promises = endpoints.map(([endpoint, setter]) => {
      return fetch(api + endpoint)
        .then((res) => res.json())
        .then((json) => setter(json));
    });
    Promise.all(promises).then(() => setReceivedResponse(true));
  }, []);

  switch (receivedResponse) {
    case true:
      return (
        <Router>
          <Routes>
            <Route path="/">
              <Route index element={<HomePage seasons={seasons} />} />
              <Route path=":year/:grade" element={<ResultsPage />}></Route>
            </Route>
          </Routes>
        </Router>
      );
    case false:
      return <>Loading...</>;
    default:
      return <h1>Sorry, an error occurred</h1>;
  }
};

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
