import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PapoLogo from "../images/papo-logo.png";
import "../index.css";
import SeasonCard from "../components/SeasonCard";

const HomePage = ({ data: { seasons, grades } }) => {
  useEffect(() => {
    document.title = "PAPO OY Points";
  });
  return (
    <div className="max-w-screen-md m-auto">
      <div className="sm:m-10 p-4 flex flex-row items-center">
        <img src={PapoLogo} className="w-20 sm:w-40" />
        <h1 className="text-3xl sm:text-6xl pl-4 sm:pl-12 font-title font-bold text-red-700">
          OY Points
        </h1>
      </div>
      {Object.entries(seasons)
        .sort(([yeara], [yearb]) => yearb - yeara)
        .map(([year, season]) => (
          <SeasonCard year={year} season={season} grades={grades} />
        ))}
    </div>
  );
};

export default HomePage;
