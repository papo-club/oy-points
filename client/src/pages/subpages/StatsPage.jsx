import Chart from "../../components/Chart";
const ordinal = require("ordinal");

const StatsPage = ({ competitors, season, events, getPlacings }) => (
  <>
    <h1 className="text-xl sm:text-3xl mt-5 pl-2 mb-4 font-title text-center font-semibold sm:font-normal">
      Projected placing by event
    </h1>
    <Chart
      competitors={competitors}
      getPlacings={getPlacings}
      reversed
      tickFormatter={ordinal}
      events={events}
    />
    <h1 className="text-xl sm:text-3xl mt-10 pl-2 mb-4 font-title text-center font-semibold sm:font-normal">
      Total points by event
    </h1>
    <Chart
      getPlacings={getPlacings}
      competitors={competitors}
      domain={[0, season.MAX_POINTS * season.numEventsCount]}
      events={{ 0: {}, ...events }}
    />
  </>
);

export default StatsPage;
