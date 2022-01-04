import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useState } from "react";
import "./index.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";

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

  const getWinner = (competitors) => {
    const winner = Object.values(competitors)
      .sort(
        (competitora, competitorb) =>
          competitora.totalPoints - competitorb.totalPoints
      )
      .pop();
    return winner && winner.qualified !== "INEL"
      ? `${winner.firstName} ${winner.lastName}`
      : undefined;
  };

  if (!points || !grades) return "Loading...";
  return (
    <div className="max-w-screen-md m-auto">
      {points
        .sort(([yeara], [yearb]) => yearb - yeara)
        .map(([year, season, points]) => (
          <div className="bg-gray-100 sm:m-10 flex flex-col items-stretch p-4">
            <h1 className="text-8xl p-3 font-title hover:bg-gray-200">
              <Link to={`/${year}`}>{year}</Link>
            </h1>
            <table className="mt-4 text-left">
              <thead>
                <th className="font-bold text-lg sm:text-2xl font-title">
                  Grade
                </th>
                <th className="font-bold text-lg sm:text-2xl font-title">
                  {season.provisional ? "Current Winner" : "Winner"}
                </th>
              </thead>
              {Object.entries(points).map(([idgrade, competitors]) => {
                return (
                  <Link
                    to={`/${year}/${idgrade}`}
                    className="table-row hover:bg-gray-200 border-t"
                  >
                    <td className="p-1">{grades[idgrade].name}</td>
                    <td className={season.provisional && "italic"}>
                      {getWinner(competitors)}
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
