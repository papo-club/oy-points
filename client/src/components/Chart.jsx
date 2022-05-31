import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

const colours = [
  "#EBBB09",
  "#F2990C",
  "#DB5200",
  "#EB0278",
  "#DC05FO",
  "#760CF7",
  "#0005E0",
  "#0C7AF7",
  "#00DCF0",
  "#00F0B0",
  "#0BF741",
  "#50E000",
  "#F2F70C",
  "#222222",
  "#666666",
  "#AAAAAA",
  "#DDDDDD",
];

const topX = 10;

const Chart = ({
  competitors,
  domain,
  reversed,
  events,
  getPlacings,
  tickFormatter,
}) => {
  const getTotalPoints = ([idevent], competitors) => {
    let result = {};
    Object.entries(competitors).forEach(
      ([idcompetitor, competitor]) =>
        (result[idcompetitor] =
          idevent > 0 ? competitor.projectedAvg[idevent] : 0)
    );
    if (idevent > 0) result.event = "OY" + idevent;
    return result;
  };
  const data = Object.entries(events).map(([idevent, event_]) =>
    getPlacings(
      Object.entries(getTotalPoints([idevent, event_], competitors)).map(
        ([idcompetitor, points]) => ({ payload: idcompetitor, key: points })
      )
    )
      .filter(({ placing }) => placing <= topX)
      .reduce((acc, { payload, placing }) => ({ ...acc, [payload]: placing }), {
        name: idevent,
      })
  );

  const Graph = () => (
    <LineChart height={500} data={data}>
      <XAxis dataKey="event" />
      <YAxis
        domain={domain || [1, topX]}
        tickCount={topX}
        width={40}
        interval="preserveStartEnd"
        reversed={reversed}
        axisLine={!reversed}
        tickFormatter={tickFormatter}
      />
      <Legend />
      <CartesianGrid stroke="#eee" strokeDasharray="1 1" />
      {[
        ...new Set(
          data.reduce(
            (acc, event) => [
              ...acc,
              ...Object.keys(event).slice(0, Object.keys(event).length - 1),
            ],
            []
          )
        ),
      ].map((idcompetitor, index) => (
        <Line
          name={`${competitors[idcompetitor].firstName} ${competitors[idcompetitor].lastName}`}
          type="monotone"
          strokeWidth={4}
          key={idcompetitor}
          dataKey={idcompetitor}
          stroke={colours[index]}
        />
      ))}
    </LineChart>
  );

  return (
    <>
      <ResponsiveContainer
        width="100%"
        height={500}
        debounce={true}
        className="hidden sm:block"
      >
        {Graph()}
      </ResponsiveContainer>
      <ResponsiveContainer
        width="100%"
        height={300}
        debounce={true}
        className="block sm:hidden"
      >
        {Graph()}
      </ResponsiveContainer>
    </>
  );
};

export default Chart;
