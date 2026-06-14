import { useEffect, useState, useMemo } from "react";
import { db } from "../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Search, RotateCcw, ChevronDown, ArrowLeftRight, Users, Clock } from "lucide-react";

// BrowseTicketsPage renders a searchable, filterable list of ticket listings from Firestore.
// It handles data fetching, input state, filtering, sorting, and rendering the UI for junior developers.
const BrowseTicketsPage = () => {
  // tickets stores the raw list of ticket listings retrieved from Firestore.
  const [tickets, setTickets] = useState([]);
  // loading is true while the app is fetching data from Firestore.
  const [loading, setLoading] = useState(true);
  // navigate is used to navigate between app routes programmatically.
  const navigate = useNavigate();

  // ── Search bar state ───────────────────────────────────────────────────
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo]     = useState("");
  const [searchDate, setSearchDate] = useState("");

  // Filter inputs are separate from the search bar inputs.
  // Filters apply immediately to the displayed results, while the search bar requires an explicit click.
  const [filterFrom,     setFilterFrom]     = useState("");
  const [filterTo,       setFilterTo]       = useState("");
  const [filterDate,     setFilterDate]     = useState("");
  const [filterClass,    setFilterClass]    = useState("Any class");
  const [filterMaxPrice, setFilterMaxPrice] = useState(5000);
  const [filterMinSeats, setFilterMinSeats] = useState("1+");

  // ── Sort state ─────────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState("Price: Low to High");

  // Applied search values are the search terms that were active when the user clicked Search.
  // This allows the user to edit the search fields without automatically changing results until they submit.
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo,   setAppliedTo]   = useState("");
  const [appliedDate, setAppliedDate] = useState("");

  // Fetch ticket listings from Firestore once when the page loads.
  // The query orders listings by the creation date, newest first.
  useEffect(() => {
    const fetchTickets = async () => {
      const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setTickets(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchTickets();
  }, []);

  // When the user clicks the Search button, the current search inputs become the active search filters.
  const handleSearch = () => {
    setAppliedFrom(searchFrom);
    setAppliedTo(searchTo);
    setAppliedDate(searchDate);
  };

  // Swap the 'From' and 'To' search values to let the user quickly reverse the route.
  const handleSwap = () => {
    setSearchFrom(searchTo);
    setSearchTo(searchFrom);
  };

  // Reset filter controls back to their default values.
  const handleReset = () => {
    setFilterFrom("");
    setFilterTo("");
    setFilterDate("");
    setFilterClass("Any class");
    setFilterMaxPrice(5000);
    setFilterMinSeats("1+");
  };

  // Convert the minimum seats filter value into a number for comparisons.
  const minSeatsNumber = parseInt(filterMinSeats) || 1;

  // seatCount converts an available seats string like "3 seats" into a numeric count.
  const seatCount = (seats) => {
    const n = parseInt(seats);
    return isNaN(n) ? 1 : n;
  };

  // Compute the visible ticket list by applying search, filter, and sort logic.
  // useMemo avoids recomputing the list unnecessarily when related state has not changed.
  const filtered = useMemo(() => {
    let result = tickets.filter((t) => {
      if (appliedFrom && !t.from?.toLowerCase().includes(appliedFrom.toLowerCase())) return false;
      if (appliedTo   && !t.to?.toLowerCase().includes(appliedTo.toLowerCase()))     return false;
      if (appliedDate && t.journeyDate !== appliedDate)                               return false;
      if (filterFrom  && !t.from?.toLowerCase().includes(filterFrom.toLowerCase()))  return false;
      if (filterTo    && !t.to?.toLowerCase().includes(filterTo.toLowerCase()))      return false;
      if (filterDate  && t.journeyDate !== filterDate)                                return false;
      if (filterClass !== "Any class" && t.trainClass !== filterClass)               return false;
      if (Number(t.price) > filterMaxPrice)                                           return false;
      if (seatCount(t.seats) < minSeatsNumber)                                        return false;
      return true;
    });

    if (sortBy === "Price: Low to High") result.sort((a, b) => Number(a.price) - Number(b.price));
    if (sortBy === "Price: High to Low") result.sort((a, b) => Number(b.price) - Number(a.price));
    if (sortBy === "Earliest Departure") result.sort((a, b) => (a.departureTime || "").localeCompare(b.departureTime || ""));
    if (sortBy === "Latest Departure")   result.sort((a, b) => (b.departureTime || "").localeCompare(a.departureTime || ""));

    return result;
  }, [tickets, appliedFrom, appliedTo, appliedDate, filterFrom, filterTo, filterDate, filterClass, filterMaxPrice, minSeatsNumber, sortBy]);

  // getDuration calculates the travel duration in hours and minutes from departure and arrival times.
  // It accounts for overnight trips by wrapping into the next day when arrival is earlier than departure.
  const getDuration = (dep, arr) => {
    if (!dep || !arr) return null;
    const [dh, dm] = dep.split(":").map(Number);
    const [ah, am] = arr.split(":").map(Number);
    let mins = (ah * 60 + am) - (dh * 60 + dm);
    if (mins < 0) mins += 24 * 60;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  };

  // getInitials builds a short avatar abbreviation from the seller's name.
  const getInitials = (name) =>
    (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  // While the ticket data is loading, render a simple spinner to indicate progress.
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <svg className="animate-spin h-7 w-7 text-gray-400" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  );

  return (
    <div className="min-h-screen">

      {/* ── Search bar ── */}
      {/* The top search bar allows route/date search values to be applied explicitly. */}
      <div className="border-b border-gray-100 px-4 py-4 mt-[100px]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">

          {/* From */}
          {/* Search input for departure city. */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={15} />
            </span>
            <input
              placeholder="From"
              value={searchFrom}
              onChange={(e) => setSearchFrom(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          {/* Swap */}
          {/* Swap the from/to fields so users can quickly reverse the route. */}
          <button
            onClick={handleSwap}
            className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 hover:bg-gray-50 transition flex-shrink-0"
          >
            <ArrowLeftRight size={15} className="text-gray-500" />
          </button>

          {/* To */}
          {/* Search input for arrival city. */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={15} />
            </span>
            <input
              placeholder="To"
              value={searchTo}
              onChange={(e) => setSearchTo(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          {/* Date */}
          {/* Search input for the journey date. */}
          <div className="relative flex-1">
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          {/* Search button */}
          {/* Clicking Search updates the applied search filters and refreshes the visible results. */}
          <button
            onClick={handleSearch}
            className="flex items-center justify-center gap-2 bg-black text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-gray-800 transition flex-shrink-0"
          >
            <Search size={15} />
            Search
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6">

        {/* ── Filters sidebar ── */}
        {/* The sidebar contains immediate filters that update the results as the user changes them. */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="border border-gray-200 rounded-2xl p-5">

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900">Filters</h2>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            </div>

            {/* From */}
            {/* Filter by departure city. */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">From</label>
              <input
                placeholder="Departure city"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            {/* To */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">To</label>
              <input
                placeholder="Arrival city"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            {/* Journey Date */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Journey Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            {/* Train Class */}
            {/* Filter by train type so users can narrow search to their preferred class. */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Train Class</label>
              <div className="relative">
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 appearance-none focus:outline-none focus:ring-2 focus:ring-black/10"
                >
                  {["Any class", "Economy", "Sleeper", "AC 3-Tier", "AC 2-Tier", "First AC"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Price Range */}
            {/* Slider to limit results to tickets at or below the selected maximum price. */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                Price Range: ₹0 – ₹{filterMaxPrice.toLocaleString()}
              </label>
              <input
                type="range"
                min={0}
                max={5000}
                step={100}
                value={filterMaxPrice}
                onChange={(e) => setFilterMaxPrice(Number(e.target.value))}
                className="w-full accent-black"
              />
            </div>

            {/* Min Seats */}
            {/* Filter out listings that do not have enough seats available. */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Min. Seats Available</label>
              <div className="relative">
                <select
                  value={filterMinSeats}
                  onChange={(e) => setFilterMinSeats(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 appearance-none focus:outline-none focus:ring-2 focus:ring-black/10"
                >
                  {["1+", "2+", "3+", "4+"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

          </div>
        </aside>

        {/* ── Results ── */}
        {/* This section shows search results with sorting and ticket cards. */}
        <div className="flex-1 min-w-0">

          {/* Results header */}
          {/* The header shows how many tickets match and provides sorting options. */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600 font-medium">
              {filtered.length} listing{filtered.length !== 1 ? "s" : ""} found
            </p>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2 text-sm bg-white appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-black/10 font-medium"
              >
              {/* Select a sort order to change how results are ordered on screen. */}
                {["Price: Low to High", "Price: High to Low", "Earliest Departure", "Latest Departure"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Empty state */}
          {/* Show this message when no tickets match the current filters and search. */}
          {filtered.length === 0 ? (
            <div className="text-center py-24 text-gray-400 border border-gray-100 rounded-2xl">
              <Search size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No tickets match your search</p>
              <p className="text-xs mt-1">Try adjusting filters or search terms</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((ticket) => {
                const duration = getDuration(ticket.departureTime, ticket.arrivalTime);
                const initials = getInitials(ticket.fullName);

                return (
                  <div
                    key={ticket.id}
                    className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition"
                  >
                    {/* Top: train name + badges */}
                    {/* Display the train name and ticket class, plus a status badge. */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">{ticket.trainName || "—"}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{ticket.trainNumber || ""}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">
                          {ticket.trainClass}
                        </span>
                        <span className="text-xs bg-black text-white px-2.5 py-1 rounded-full">
                          Active
                        </span>
                      </div>
                    </div>

                    {/* Time row */}
                    {/* Show departure time, arrival time, and trip duration. */}
                    <div className="flex items-center gap-3 mb-3">
                      <div>
                        <p className="text-xl font-bold text-gray-900">{ticket.departureTime || "—"}</p>
                        <p className="text-xs text-gray-500">{ticket.from || "—"}</p>
                      </div>
                      <div className="flex-1 flex flex-col items-center gap-0.5">
                        {duration && (
                          <span className="text-xs text-gray-400">{duration}</span>
                        )}
                        <div className="flex items-center w-full gap-1">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-gray-300 text-xs">→</span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">{ticket.arrivalTime || "—"}</p>
                        <p className="text-xs text-gray-500">{ticket.to || "—"}</p>
                      </div>
                    </div>

                    {/* Date + seats */}
                    {/* Show the journey date and how many seats are available. */}
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{ticket.journeyDate || "—"}</span>
                      </div>
                      <span>·</span>
                      <div className="flex items-center gap-1">
                        <Users size={12} />
                        <span>{ticket.seats} available</span>
                      </div>
                    </div>

                    {/* Divider */}
                    {/* The bottom row shows seller info and the call-to-action button. */}
                    <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                      {/* Seller */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{ticket.fullName || "—"}</p>
                        </div>
                      </div>

                      {/* Price + contact */}
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-base font-bold text-gray-900">₹{ticket.price}</p>
                          <p className="text-[10px] text-gray-400">per seat</p>
                        </div>
                        <a
                          href={`mailto:${ticket.email}`}
                          className="bg-black text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrowseTicketsPage;