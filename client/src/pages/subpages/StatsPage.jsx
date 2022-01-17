import Chart from "../../components/Chart";
const ordinal = require("ordinal");

const getPlacings = ([idevent], topXCompetitors) => {
  let result = {};
  topXCompetitors
    .sort(([, a], [, b]) => b.projectedAvg[idevent] - a.projectedAvg[idevent])
    .forEach(([idcompetitor], index) => (result[idcompetitor] = index + 1));
  result.event = "OY" + idevent;
  return result;
};

const getTotalPoints = ([idevent], topXCompetitors) => {
  let result = {};
  topXCompetitors.forEach(
    ([idcompetitor, competitor]) =>
      (result[idcompetitor] = idevent > 0 ? competitor.totalPoints[idevent] : 0)
  );
  if (idevent > 0) result.event = "OY" + idevent;
  return result;
};

const StatsPage = ({ competitors, season, events }) => (
  <>
    <h1 className="text-xl sm:text-3xl mt-5 pl-2 mb-4 font-title text-center font-semibold sm:font-normal">
      Projected placing by event
    </h1>
    <Chart
      forEachEvent={getPlacings}
      competitors={competitors}
      reversed
      tickFormatter={ordinal}
      events={events}
    />
    <h1 className="text-xl sm:text-3xl mt-10 pl-2 mb-4 font-title text-center font-semibold sm:font-normal">
      Total points by event
    </h1>
    <Chart
      forEachEvent={getTotalPoints}
      competitors={competitors}
      domain={[0, season.MAX_POINTS * season.numEventsCount]}
      events={{ 0: {}, ...events }}
    />
  </>
);

export default StatsPage;
