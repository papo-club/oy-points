import { useNavigate } from "react-router-dom";
import ProvisionalBadge from "../components/ProvisionalBadge";

const getWinner = (season, competitors) => {
  const winner = Object.values(competitors)
    .sort(
      (a, b) =>
        (a.qualified !== "INEL") - (b.qualified !== "INEL") ||
        (season.provisional
          ? a.projectedAvg[season.lastEvent] -
              b.projectedAvg[season.lastEvent] ||
            Object.keys(a.results).length - Object.keys(b.results).length
          : a.totalPoints[season.lastEvent] - b.totalPoints[season.lastEvent] ||
            Object.keys(a.results).length - Object.keys(b.results).length)
    )
    .pop();
  return winner && winner.qualified !== "INEL"
    ? `${winner.firstName} ${winner.lastName}`
    : undefined;
};

const SeasonCard = ({ grades, season, year }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-gray-100 sm:m-10 flex flex-col items-stretch p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-end">
        <h1 className="text-8xl p-3 font-title">{year}</h1>
        <div className="relative -top-3 left-3.5 sm:left-0 sm:mb-3">
          <ProvisionalBadge provisional={season.season.provisional} />
        </div>
      </div>
      <table className="mt-4 text-left">
        <thead>
          <tr>
            <th className="font-bold text-lg sm:text-2xl font-title">Grade</th>
            <th className="font-bold text-lg sm:text-2xl font-title">
              {season.season.provisional ? "Current Winner" : "Winner"}
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(season.points)
            .sort(
              ([a], [b]) =>
                grades[b].difficulty - grades[a].difficulty ||
                (grades[b].gender === "M" ? 1 : -1)
            )
            .map(([idgrade, competitors]) => {
              return (
                <tr
                  onClick={() => navigate(`/${year}/${idgrade}`)}
                  className="hover:bg-gray-200 border-t"
                  key={idgrade}
                >
                  <td className="p-1">{grades[idgrade].name}</td>
                  <td className={season.season.provisional && "italic"}>
                    {getWinner(season.season, competitors)}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};

export default SeasonCard;
