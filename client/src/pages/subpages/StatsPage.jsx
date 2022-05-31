import Chart from "../../components/Chart";
const ordinal = require("ordinal");

const topX = 10;

const StatsPage = ({ competitors, season, events, getPlacings }) => {
  const getAttributeByEvent = (attribute, [idevent], competitors) => {
    let result = {};
    Object.entries(competitors).forEach(
      ([idcompetitor, competitor]) =>
        (result[idcompetitor] =
          idevent > 0 ? competitor[attribute][idevent] : 0)
    );
    return result;
  };
  const avgData = Object.entries(events).map(([idevent, event_]) =>
    getPlacings(
      Object.entries(
        getAttributeByEvent("projectedAvg", [idevent, event_], competitors)
      ).map(([idcompetitor, points]) => ({
        payload: idcompetitor,
        key: points,
      }))
    )
      .filter(({ placing }) => placing <= topX)
      .reduce((acc, { payload, placing }) => ({ ...acc, [payload]: placing }), {
        name: idevent,
      })
  );

  const totalData = [[0, 0], ...Object.entries(events)].map(
    ([idevent, event_]) =>
      getAttributeByEvent(
        "totalPoints",
        [idevent, event_],
        Object.fromEntries(
          Object.entries(competitors)
            .sort(
              ([, a], [, b]) =>
                b.totalPoints[season.lastEvent] -
                a.totalPoints[season.lastEvent]
            )
            .slice(0, 10)
        )
      )
  );

  console.log(totalData);

  return (
    <>
      <h1 className="text-xl sm:text-3xl mt-5 pl-2 mb-4 font-title text-center font-semibold sm:font-normal">
        Projected placing by event
      </h1>
      <Chart
        competitors={competitors}
        getPlacings={getPlacings}
        reversed
        tickFormatter={ordinal}
        topX={topX}
        events={events}
        data={avgData}
      />
      <h1 className="text-xl sm:text-3xl mt-10 pl-2 mb-4 font-title text-center font-semibold sm:font-normal">
        Total points by event
      </h1>
      <Chart
        getPlacings={getPlacings}
        competitors={competitors}
        data={totalData}
        topX={topX}
        domain={[0, season.MAX_POINTS * season.numEventsCount]}
        events={{ 0: {}, ...events }}
      />
    </>
  );
};

export default StatsPage;
