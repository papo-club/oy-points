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
  "#e60049",
  "#0bb4ff",
  "#50e991",
  "#e6d800",
  "#9b19f5",
  "#ffa300",
  "#dc0ab4",
  "#b3d4ff",
  "#00bfa0",
  "#555555",
];

const topX = 10;

const Chart = ({
  competitors,
  domain,
  reversed,
  events,
  forEachEvent,
  tickFormatter,
}) => {
  const topXCompetitors = competitors
    .filter(([, competitor]) => competitor.qualified !== "INEL")
    .slice(0, topX);

  const Graph = () => (
    <LineChart
      height={500}
      data={Object.entries(events).map(([idevent, event_]) => {
        return forEachEvent([idevent, event_], topXCompetitors);
      })}
    >
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
      {topXCompetitors.map(([idcompetitor, competitor], index) => (
        <Line
          name={`${competitor.firstName} ${competitor.lastName}`}
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
