import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ErrorMsg from "../components/ErrorMsg";
import ProvisionalBadge from "../components/ProvisionalBadge";
import PapoLogo from "../images/papo-logo.png";
import HelpPage from "./subpages/HelpPage";
import PointsPage from "./subpages/PointsPage";
import StatsPage from "./subpages/StatsPage";

const ResultsPage = ({
  data: { seasons, grades, eligibility, derivation },
}) => {
  const [subpage, setSubpage] = useState("points");
  const { year, grade } = useParams();

  const season = seasons[year].season;
  const events = seasons[year].events;
  const points = seasons[year].points[grade];

  const sortedCompetitors = Array.from(
    new Map(
      Object.entries(points).sort(
        ([, a], [, b]) =>
          (b.qualified !== "INEL") - (a.qualified !== "INEL") ||
          (season.provisional
            ? b.projectedAvg[season.lastEvent] -
              a.projectedAvg[season.lastEvent]
            : b.totalPoints[season.numEvents] - a.totalPoints[season.numEvents])
      )
    ).entries()
  );

  useEffect(() => {
    document.title = `OY Points for ${year} | ${grades[grade].name}`;
    window.scrollTo(0, 0);
  }, []);

  const Subpage = ({ subpage }) => {
    switch (subpage) {
      case "points":
        return (
          <PointsPage
            season={season}
            competitors={sortedCompetitors}
            events={events}
            eligibility={eligibility}
          />
        );
      case "stats":
        return (
          <StatsPage
            competitors={sortedCompetitors}
            season={season}
            events={events}
          />
        );
      case "help":
        return <HelpPage year={year} season={season} derivation={derivation} />;
      default:
        return <ErrorMsg text={"Sorry, something went wrong."} />;
    }
  };

  const NavbarButton = ({ id, name }) => (
    <button
      className={` font-title text-xl capitalize hover:text-red-700 ${
        subpage === id ? "text-red-700 font-bold" : "font-semibold"
      }`}
      onClick={() => setSubpage(id)}
    >
      {name ? name : id}
    </button>
  );

  return (
    <>
      <div className="flex flex-col gap-4 max-w-screen-xl px-5 m-auto my-10">
        <div className="self-center lg:self-start">
          <Link to="/">
            <div className="self-center lg:self-start flex flex-row justify-center lg:justify-start lg:ml-1 h-5 mb-5">
              <img src={PapoLogo} />
              <h1 className="text-2xl ml-2 font-title self-center font-bold text-red-700">
                OY Points
              </h1>
            </div>
          </Link>
          <h1 className="hidden lg:block font-title text-5xl">
            {grades[grade].name
              .split(" ")
              .splice(0, grades[grade].name.split(" ").length - 1)
              .join(" ")}
          </h1>
          <div className="flex flex-row items-center gap-5">
            <h1 className="hidden lg:block font-title text-5xl">
              {grades[grade].name.split(" ").splice(-1)}
            </h1>
            <h1 className="inline lg:hidden font-title text-3xl sm:text-4xl">
              {grades[grade].name}
            </h1>
            <ProvisionalBadge provisional={season.provisional} />
          </div>
        </div>
        <div className="self-center lg:self-start flex flex-row gap-5">
          <NavbarButton id="points" />
          <NavbarButton id="stats" />
          <NavbarButton id="help" name="help / info" />
        </div>
        <div>
          <Subpage subpage={subpage} />
        </div>
      </div>
    </>
  );
};

export default ResultsPage;
