import React from "react";

const derivationColors = {
  WIN: "bg-green-100",
  PLAN: "bg-yellow-100",
  CTRL: "bg-yellow-100",
};

const getStyle = (derivationID) => {
  switch (derivationID) {
    case "INEL":
      return "text-gray-400 font-normal italic";
    case "QUAL":
      return "text-black";
    case "PEND":
      return "italic";
  }
};

const PointsPage = ({
  season,
  competitorsWithPlacings,
  events,
  eligibility,
}) => {
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
                    <div className="absolute bottom-0 left-0 border-b overflow-hidden text-ellipsis leading-5">
                      <span className="font-normal">
                        OY{idevent} {event_.discipline}
                      </span>
                      <br />
                      {event_.name}
                    </div>
                  </div>
                </th>
                <th className="lg:hidden">OY{idevent}</th>
              </React.Fragment>
            ))}
            <th className="text-right w-20 pr-3">Points</th>
            <th className="text-right w-20 pr-3">
              {season.provisional ? "Projected Total" : "Performance"}
            </th>
          </tr>
        </thead>
        <tbody>
          {competitorsWithPlacings.map(
            ({ payload: competitor, key: points, placing }, index) => (
              <tr key={competitor} className="odd:bg-white even:bg-gray-50">
                <th
                  className={`text-2xl sm:text-4xl text-right font-title ${getStyle(
                    competitor.qualified
                  )}`}
                >
                  {competitor.qualified !== "INEL" ? placing : `(${placing})`}
                </th>
                <th
                  className={`pl-4 text-sm sm:text-base font-title text-left ${getStyle(
                    competitor.qualified
                  )}`}
                >
                  <div>{`${competitor.firstName} ${competitor.lastName}`}</div>
                  <div>{eligibility[competitor.qualified].type}</div>
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
                    ? competitor.projectedTotal[season.lastEvent]
                    : (
                        (competitor.totalPoints[season.numEvents] * 100) /
                        (season.MAX_POINTS * season.numEventsCount)
                      ).toFixed(0) + "%"}
                </th>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PointsPage;
