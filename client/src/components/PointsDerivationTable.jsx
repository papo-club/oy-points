const PointsDerivationTable = ({ derivation, season }) => (
  <div className="relative overflow-auto">
    <table className="border-collapse border-hidden">
      <thead>
        <tr className="text-left">
          <th className="text-right pr-3">Code</th>
          <th className="pr-3">Points</th>
          <th>Name</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(derivation).map(([idderivation, derivation]) => (
          <tr key={idderivation} className="odd:bg-white even:bg-gray-50 h-12">
            <td className="text-l border sm:text-2xl text-right font-title px-3 font-bold">
              {idderivation}
            </td>
            <td className="text-l border sm:text-2xl text-left font-title px-3 font-bold sm:whitespace-nowrap">
              {season[derivation.points] ||
                derivation.points ||
                (derivation.type !== "OK" && `${season["MAX_POINTS"]} - ? `) ||
                `${season["MIN_TIME_POINTS"]} - ${season["MAX_POINTS"]}`}
            </td>
            <td className="px-3 border">{derivation.type}</td>
            <td className="px-3 border">{derivation.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default PointsDerivationTable;
