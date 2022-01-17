const api = "http://localhost:9000";
const globalEndpoints = ["grades", "derivation", "eligibility"];
const seasonEndpoints = ["season", "points", "events"];
const seasonEndpoint = "seasons";

const fetchEndpoint = (endpoint, year = "") =>
  fetch(`${api}/${endpoint}/${year}`).then((res) => res.json());

const endpointsToObject = (endpoints, promises) =>
  Promise.all(promises).then((data) =>
    Object.fromEntries(
      endpoints.map((endpoint, index) => [endpoint, data[index]])
    )
  );

const getAllData = () => {
  return Promise.resolve(
    endpointsToObject(
      [seasonEndpoint, ...globalEndpoints],
      [
        fetchEndpoint(seasonEndpoint).then((seasons) =>
          endpointsToObject(
            seasons,
            seasons.map((year) =>
              endpointsToObject(
                seasonEndpoints,
                seasonEndpoints.map((endpoint) => fetchEndpoint(endpoint, year))
              )
            )
          )
        ),
        ...globalEndpoints.map((endpoint) => fetchEndpoint(endpoint)),
      ]
    )
  );
};

export default getAllData;
