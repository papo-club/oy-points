import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import getAllData from "./adapter";
import "./index.css";
import HomePage from "./pages/HomePage";
import ResultsPage from "./pages/ResultsPage";
import ErrorMsg from "./components/ErrorMsg";

const App = () => {
  const [receivedResponse, setReceivedResponse] = useState(null);
  const [isServerRequest, setIsServerRequest] = useState(true);
  const [data, setData] = useState({
    seasons: null,
    grades: null,
    derivation: null,
    eligibility: null,
  });

  useEffect(() => {
    if (window.location.pathname.split("/").slice(1).shift() !== "api") {
      setIsServerRequest(false);
    }
  }, []);

  useEffect(() => {
    if (!isServerRequest) {
      Promise.resolve(getAllData())
        .then(setData)
        .then(() => setReceivedResponse(true))
        .catch((error) => setReceivedResponse(false));
    }
  }, [isServerRequest]);

  if (!isServerRequest) {
    switch (receivedResponse) {
      case true:
        return (
          <Router>
            <Routes>
              <Route path="/">
                <Route index element={<HomePage data={data} />} />
                <Route
                  path=":year/:grade"
                  element={<ResultsPage data={data} />}
                ></Route>
              </Route>
            </Routes>
          </Router>
        );
      case false:
        return <ErrorMsg text="Sorry, API is down. Try again later" />;
      default:
        return <ErrorMsg text="Loading..." />;
    }
  } else {
    return <></>;
  }
};

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
