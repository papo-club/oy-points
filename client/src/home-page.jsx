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
    <div className="grid gap-5 grid-flow-col max-w-screen-lg m-auto">
      {points
        .sort(([yeara], [yearb]) => yearb - yeara)
        .map(([year, season, points]) => (
          <div className="bg-gray-100 w- flex flex-col items-stretch p-4">
            <Link to={`/${year}`}>
              <button className="bg-gradient-to-b from-red-400 to-red-600 h-20 border-4 border-red-600 rounded-md w-full text-white font-title font-bold text-2xl">
                {year}
                <FontAwesomeIcon icon={faChevronRight} className="ml-4" />
              </button>
            </Link>
            <table className="mt-4">
              <thead>
                <th className="font-bold text-2xl font-title">Grade</th>
                <th className="font-bold text-2xl font-title">
                  {season.provisional ? "Current Winner" : "Winner"}
                </th>
              </thead>
              {Object.entries(points).map(([idgrade, competitors]) => {
                return (
                  <tr>
                    <td className="p-1">{grades[idgrade].name}</td>
                    <td className={season.provisional && "italic"}>
                      {getWinner(competitors)}
                    </td>
                  </tr>
                );
              })}
            </table>
          </div>
        ))}
    </div>
  );
};

export default HomePage;
