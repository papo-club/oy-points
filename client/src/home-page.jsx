import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PapoLogo from "./images/papo-logo.png";
import "./index.css";

const HomePage = ({ seasons }) => {
  const [points, setPoints] = useState(null);
  const [grades, setGrades] = useState(null);
  useEffect(() => {
    const api = "http://localhost:9000";

    Promise.all(
      Object.entries(seasons).map(([year, season]) =>
        fetch(`${api}/points/${year}`)
          .then((res) => res.json())
          .then((json) => [year, season, json])
      )
    ).then(setPoints);
    Promise.resolve(
      fetch(`${api}/grades/`)
        .then((res) => res.json())
        .then(setGrades)
    );
  }, [seasons]);

  const getWinner = (season, competitors) => {
    const winner = Object.values(competitors)
      .sort(
        (a, b) =>
          (a.qualified !== "INEL") - (b.qualified !== "INEL") ||
          (season.provisional
            ? a.projectedAvg[season.lastEvent] -
              b.projectedAvg[season.lastEvent]
            : a.totalPoints[season.lastEvent] - b.totalPoints[season.lastEvent])
      )
      .pop();
    return winner && winner.qualified !== "INEL"
      ? `${winner.firstName} ${winner.lastName}`
      : undefined;
  };

  if (!points || !grades)
    return (
      <div className="w-screen h-screen flex flex-row items-center justify-center text-2xl sm:text-4xl text-gray-300 font-title tracking-wider">
        Loading...
      </div>
    );
  return (
    <div className="max-w-screen-md m-auto">
      <div className="sm:m-10 p-4 flex flex-row items-center">
        <img src={PapoLogo} className="w-20 sm:w-40" />
        <h1 className="text-3xl sm:text-6xl pl-4 sm:pl-12 font-title font-bold text-red-700">
          OY Points
        </h1>
      </div>
      {points
        .sort(([yeara], [yearb]) => yearb - yeara)
        .map(([year, season, points]) => (
          <div className="bg-gray-100 sm:m-10 flex flex-col items-stretch p-4">
            <h1 className="text-8xl p-3 font-title">{year}</h1>
            <table className="mt-4 text-left">
              <thead>
                <th className="font-bold text-lg sm:text-2xl font-title">
                  Grade
                </th>
                <th className="font-bold text-lg sm:text-2xl font-title">
                  {season.provisional ? "Current Winner" : "Winner"}
                </th>
              </thead>
              {Object.entries(points)
                .sort(
                  ([a], [b]) =>
                    grades[b].difficulty - grades[a].difficulty ||
                    (grades[b].gender === "M" ? 1 : -1)
                )
                .map(([idgrade, competitors]) => {
                  return (
                    <Link
                      to={`/${year}/${idgrade}`}
                      className="table-row hover:bg-gray-200 border-t"
                    >
                      <td className="p-1">{grades[idgrade].name}</td>
                      <td className={season.provisional && "italic"}>
                        {getWinner(season, competitors)}
                      </td>
                    </Link>
                  );
                })}
            </table>
          </div>
        ))}
    </div>
  );
};

export default HomePage;
