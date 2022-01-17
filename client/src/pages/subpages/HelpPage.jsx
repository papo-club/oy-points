import PointsDerivationTable from "../../components/PointsDerivationTable";

const HelpPage = ({ year, season, derivation }) => (
  <div className="max-w-screen-lg">
    <h1 className="text-xl sm:text-3xl mt-5 mb-4 font-title font-semibold sm:font-normal">
      How are OY points calculated?
    </h1>
    <p>
      After each OY event, the winner of each grade recieves {season.MAX_POINTS}{" "}
      points. Every other competitor in the grade recieves scaled points based
      on how their time compares to the winning time. A baseline minimum of{" "}
      {season.MIN_TIME_POINTS} points can be awarded this way, so even if the
      scaled points are lower than this, at least {season.MIN_TIME_POINTS} are
      guaranteed. As well as the winner, the event organisers gain{" "}
      {season.MAX_POINTS} points for the event. However, a competitor can only
      gain points in this way once per season. A maximum of{" "}
      {season.numEventsCount} of the {season.numEvents} events will count
      towards the {year} season, so if a competitor has results in more events
      than this, the best {season.numEventsCount} results will count towards
      their total score.
    </p>
    <h1 className="text-xl sm:text-3xl mt-10 mb-4 font-title font-semibold sm:font-normal">
      How is my OY grade calculated?
    </h1>
    <p>
      Your OY grade is calculated based on the grade you have most commonly
      raced in for the {year} season. If you have raced in multiple grades
      equally, the more 'difficult' grade is always chosen. If you have only
      raced in an event without standard OY grades (such as a score event), you
      will be placed in the most 'difficult' OY grade that is associated with
      that event (e.g. Long Red) until you have raced in a standard OY event and
      your grade can be correctly assumed.
    </p>
    {season.provisional ? (
      <>
        <h1 className="text-xl sm:text-3xl mt-10 mb-4 font-title font-semibold sm:font-normal">
          How are provisional placings determined throughout the season?
        </h1>
        <p>
          Current placings are determined using the 'projected average' score.
          This score is calculated by multiplying the competitor's average score
          for each event by the amount of events still to go in the season. This
          enables a fairer comparison between competitors when some have
          competed in more events than others. As the season progresses, the
          projected average score will get closer and closer to the final score
          for each competitor, so placings are more likely to change near the
          beginning of the season than at the end.
        </p>
      </>
    ) : (
      <>
        <h1 className="text-xl sm:text-3xl mt-10 mb-4 font-title font-semibold sm:font-normal">
          What is the 'performance score'?
        </h1>
        <p>
          The performance score is a measure of how close a competitor's final
          score was to the 'superman' or best possible score. For the {year}{" "}
          season the best possible score is{" "}
          {season.numEventsCount * season.MAX_POINTS}. The higher a competitor's
          performance score, the closer they were to acheiving a perfect season.
          If the winner of a grade has a lower performance score, this indicates
          a more competitive season/grade and vice versa.
        </p>
      </>
    )}
    <h1 className="text-xl sm:text-3xl mt-10 mb-4 font-title font-semibold sm:font-normal">
      How do I become eligible for the {year} season?
    </h1>
    <p>
      Although a maximum of {season.numEventsCount} of the {season.numEvents}{" "}
      count towards the {year} season, only {season.numEventsToQualify} events
      are needed to be eligible for the OY competition. Once a competitor has
      run {season.numEventsToQualify} events, their status will be updated from
      'Pending' to 'Qualified'.
    </p>
    <h1 className="text-xl sm:text-3xl mt-10 mb-4 font-title font-semibold sm:font-normal">
      What happens if I mispunch/run up/run down a grade?
    </h1>
    <p>
      There are several different scenarios where your race time may not have
      'OK' status and you may not receive your scaled points out of{" "}
      {season.MAX_POINTS}. These scenarios for the {year} season are described
      below, along with the amount of points you will receive if each scenario
      occurs. Note that the amount of points awarded may change based on each
      season, the below table shows the {year} season.
    </p>
    <h1 className="text-xl sm:text-3xl mt-10 mb-4 font-title font-semibold sm:font-normal">
      What do all the codes mean?
    </h1>
    <PointsDerivationTable derivation={derivation} season={season} />
    <h1 className="text-xl sm:text-3xl mt-10 mb-4 font-title font-semibold sm:font-normal">
      How are score (rogaine) OY points calculated?
    </h1>
    <p>
      Check the{" "}
      <a
        className="text-blue-600"
        href="https://papo.org.nz/assets/Uploads/OY-rules-2021-update.pdf"
      >
        official OY rules
      </a>{" "}
      for more detailed information on how OY points are calculated, including
      points calculation rules for score and double sprint events.
    </p>
  </div>
);

export default HelpPage;
