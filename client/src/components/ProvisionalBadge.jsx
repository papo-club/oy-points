const ProvisionalBadge = ({ provisional }) => (
  <h2 className="px-2 py-1 bg-red-700 rounded-lg text-white sm:text-lg mt-0.5 sm:mt-1 tracking-wide uppercase font-bold">
    {provisional ? "provisional" : "final"}
  </h2>
);

export default ProvisionalBadge;
