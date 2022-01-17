import React from "react";

const derivationColors = {
  WIN: "bg-green-100",
  PLAN: "bg-yellow-100",
  CTRL: "bg-yellow-100",
};

const PointsPage = ({ season, competitors, events, eligibility }) => {
  const createPlacings = (season, competitors) => {
    let placings = [0];
    let lastPoints = Infinity;
    for (let [, competitor] of competitors) {
      const points = season.provisional
        ? competitor.projectedAvg[season.lastEvent]
        : competitor.totalPoints[season.numEvents];
      const lastPlacing = placings[placings.length - 1];
      if (points === lastPoints) {
        placings.push(lastPlacing);
      } else {
        lastPoints = points;
        placings.push(
          lastPlacing +
            placings.filter((placing) => placing === lastPlacing).length
        );
      }
    }
    return placings.slice(1);
  };
  const placings = createPlacings(season, competitors);

  return (
    <div className="relative overflow-auto lg:overflow-visible whitespace-nowrap">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="w-2 text-right">
              {season.provisional ? "Current Placing" : "Place"}
            </th>
            <th className="w-40 text-left pl-4">Competitor</th>
            {Object.entries(events).map(([idevent, event_]) => (
              <React.Fragment key={idevent}>
                <th className="hidden lg:table-cell relative whitespace-nowrap rotated-header">
                  <div className="absolute bottom-0 left-0 text-left w-full">
                    <div className="absolute bottom-0 left-0 border-b overflow-hidden text-ellipsis">
                      OY{idevent} - {event_.name}
                    </div>
                  </div>
                </th>
                <th className="lg:hidden">OY{idevent}</th>
              </React.Fragment>
            ))}
            <th className="text-right w-20 pr-3">Points</th>
            <th className="text-right w-20 pr-3">
              {season.provisional ? "Projected Avg" : "Performance"}
            </th>
          </tr>
        </thead>
        <tbody>
          {competitors.map(([idcompetitor, competitor], index) => (
            <tr key={idcompetitor} className="odd:bg-white even:bg-gray-50">
              <th
                className={`text-2xl sm:text-4xl text-right font-title ${
                  competitor.qualified !== "INEL"
                    ? "font-bold"
                    : "font-normal italic text-gray-400"
                }`}
              >
                {competitor.qualified !== "INEL"
                  ? placings[index]
                  : `(${placings[index]})`}
              </th>
              <th
                className={`pl-4 text-sm sm:text-base font-title text-left ${
                  competitor.qualified !== "INEL" || "text-gray-400"
                }`}
              >
                <div>{`${competitor.firstName} ${competitor.lastName}`}</div>
                <div>{eligibility[competitor.qualified].name}</div>
              </th>
              {Object.entries(events).map(([idevent]) => (
                <td
                  key={idevent}
                  className={
                    "min-w-20 w-20 border-r border-t p-2 " +
                    (competitor.results[idevent]?.countsTowardsTotal &&
                    competitor.qualified !== "INEL"
                      ? derivationColors[
                          competitor.results[idevent]?.derivation
                        ]
                      : "text-gray-400 italic")
                  }
                >
                  <div className="text-2xl font-bold font-title">
                    {competitor.results[idevent]?.points}
                  </div>
                  <div className="-my-1 text-sm ">
                    {competitor.results[idevent]?.derivation}
                  </div>
                </td>
              ))}
              <th
                className={
                  "text-2xl border-t min-w-24 sm:text-4xl text-right pr-3 font-title " +
                  (competitor.qualified !== "INEL"
                    ? "font-bold"
                    : "font-normal italic text-gray-400")
                }
              >
                {competitor.totalPoints[season.lastEvent]}
              </th>
              <th
                className={
                  "text-xl sm:text-3xl text-right pr-3 font-title " +
                  (competitor.qualified !== "INEL"
                    ? "font-bold"
                    : "font-normal italic text-gray-400")
                }
              >
                {season.provisional
                  ? competitor.projectedAvg[season.lastEvent]
                  : (
                      (competitor.totalPoints[season.numEvents] * 100) /
                      (season.MAX_POINTS * season.numEventsCount)
                    ).toFixed(0) + "%"}
              </th>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PointsPage;
