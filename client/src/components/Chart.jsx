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
  "#DC05F0",
  "#760CF7",
  "#0005E0",
  "#0C7AF7",
  "#00DCF0",
  "#00F0B0",
  "#0BF741",
  "#50E000",
  "#F2F70C",
  "#964B00",
  "#000000",
  "#222222",
  "#444444",
  "#666666",
  "#888888",
  "#AAAAAA",
  "#CCCCCC",
  "#EEEEEE",
];

const Chart = ({
  competitors,
  domain,
  reversed,
  topX,
  tickFormatter,
  data,
}) => {
  const Graph = (data) => (
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
        {Graph(data)}
      </ResponsiveContainer>
      <ResponsiveContainer
        width="100%"
        height={300}
        debounce={true}
        className="block sm:hidden"
      >
        {Graph(data)}
      </ResponsiveContainer>
    </>
  );
};

export default Chart;
