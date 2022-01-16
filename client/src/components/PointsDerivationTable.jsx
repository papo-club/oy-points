const PointsDerivationTable = ({ derivation, season }) => (
  <div className="relative overflow-auto">
    <table className="border-collapse border-hidden">
      <thead>
        <th className="text-right pr-3">Code</th>
        <th className="text-left pr-3">Points</th>
        <th className="text-left">Name</th>
        <th className="text-left">Description</th>
      </thead>
      <tbody>
        {Object.entries(derivation).map(([idderivation, derivation]) => (
          <tr className="odd:bg-white even:bg-gray-50 h-12">
            <td className="text-l border sm:text-2xl text-right font-title px-3 font-bold">
              {idderivation}
            </td>
            <td className="text-l border sm:text-2xl text-left font-title px-3 font-bold sm:whitespace-nowrap">
              {season[derivation.points] ||
                derivation.points ||
                (derivation.name !== "OK" && `${season["MAX_POINTS"]} - ? `) ||
                `${season["MIN_TIME_POINTS"]} - ${season["MAX_POINTS"]}`}
            </td>
            <td className="px-3 border">{derivation.name}</td>
            <td className="px-3 border">{derivation.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default PointsDerivationTable;
