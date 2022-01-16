const derivationColors = {
  WIN: "bg-green-100",
  PLAN: "bg-yellow-100",
  CTRL: "bg-yellow-100",
};

const PointsTable = ({ season, competitors, events, eligibility }) => {
  return (
    <div className="relative overflow-auto lg:overflow-visible whitespace-nowrap">
      <table className="w-full border-collapse">
        <thead>
          <th className="sticky w-2 text-right border-b">
            {season.provisional ? "Current Placing" : "Place"}
          </th>
          <th className="sticky w-40 text-left pl-4 border-b">Competitor</th>
          {Object.entries(events).map(([idevent, event_]) => (
            <>
              <th className="hidden lg:table-cell relative whitespace-nowrap rotated-header">
                <div className="absolute bottom-0 left-0 text-left w-full">
                  <div className="absolute bottom-0 left-0 border-b overflow-hidden text-ellipsis">
                    OY{idevent} - {event_.name}
                  </div>
                </div>
              </th>
              <th className="lg:hidden">OY{idevent}</th>
            </>
          ))}
          <th className="sticky w-20 text-right pr-3">Points</th>
          <th className="border-b sticky w-20 text-right pr-3">
            {season.provisional ? "Projected Avg" : "Performance"}
          </th>
        </thead>
        <tbody>
          {competitors.map(([idcompetitor, competitor], place) => (
            <tr className="odd:bg-white even:bg-gray-50">
              <th
                className={`sticky text-2xl sm:text-4xl text-right font-title ${
                  competitor.qualified !== "INEL"
                    ? "font-bold"
                    : "font-normal italic text-gray-400"
                }`}
              >
                {competitor.qualified !== "INEL" ? place + 1 : `(${place + 1})`}
              </th>
              <th
                className={`sticky pl-4 text-sm sm:text-base font-title text-left ${
                  competitor.qualified !== "INEL" || "text-gray-400"
                }`}
              >
                <div>{`${competitor.firstName} ${competitor.lastName}`}</div>
                <div>{eligibility[competitor.qualified].name}</div>
              </th>
              {Object.entries(events).map(([idevent, event_]) => (
                <td
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
                  "sticky text-2xl border-t min-w-24 sm:text-4xl text-right pr-3 font-title " +
                  (competitor.qualified !== "INEL"
                    ? "font-bold"
                    : "font-normal italic text-gray-400")
                }
              >
                {competitor.totalPoints[season.lastEvent]}
              </th>
              <th
                className={
                  "sticky text-xl sm:text-3xl text-right pr-3 font-title " +
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

export default PointsTable;
