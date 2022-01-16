import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PapoLogo from "../images/papo-logo.png";
import "../index.css";
import SeasonCard from "../components/SeasonCard";

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
          <SeasonCard points={points} grades={grades} season={[year, season]} />
        ))}
    </div>
  );
};

export default HomePage;
