import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { db } from "../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import * as Slider from "@radix-ui/react-slider";
import {
  Search,
  RotateCcw,
  ChevronDown,
  ArrowLeftRight,
  Users,
  Clock,
  MapPin,
  SlidersHorizontal,
  Check,
  X,
} from "lucide-react";
import { KineticText } from "@/components/ui/kinetic-text";

// ── Portal-based custom dropdown ───────────────────────────────────────────
const CustomSelect = ({ value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const calcPosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const menuHeight = Math.min(options.length * 38 + 8, 220);
    const openUpward = spaceBelow < menuHeight + 8 && rect.top > menuHeight + 8;

    setMenuStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(openUpward
        ? { bottom: viewportHeight - rect.top + 5 }
        : { top: rect.bottom + 5 }),
    });
  }, [options.length]);

  const handleOpen = () => {
    if (!open) calcPosition();
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onScroll = () => calcPosition();
    const onResize = () => calcPosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, calcPosition]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className={`
          w-full flex items-center justify-between gap-2
          border rounded-lg px-3 py-2 text-sm text-left
          bg-gray-50 transition-all
          focus:outline-none focus:ring-2 focus:ring-black/10
          hover:bg-white hover:border-gray-300
          ${open ? "border-gray-400 bg-white" : "border-gray-200"}
        `}
      >
        <span className="text-gray-800 truncate">{value}</span>
        <ChevronDown
          size={13}
          className={`text-gray-400 flex-shrink-0 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden py-1"
          >
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition"
              >
                <span
                  className={
                    value === opt
                      ? "font-semibold text-gray-900"
                      : "text-gray-600"
                  }
                >
                  {opt}
                </span>
                {value === opt && (
                  <Check size={13} className="text-gray-900 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};

const classOptions = ["Any class", "Economy", "Sleeper", "AC 3-Tier", "AC 2-Tier", "First AC"];
const seatOptions = ["1+", "2+", "3+", "4+"];

// ── FilterFields ───────────────────────────────────────────────────────────
const FilterFields = ({
  filterFrom, setFilterFrom,
  filterTo, setFilterTo,
  filterDate, setFilterDate,
  filterClass, setFilterClass,
  filterPriceRange, setFilterPriceRange,
  filterMinSeats, setFilterMinSeats,
}) => (
  <>
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
        From
      </label>
      <input
        placeholder="Departure city"
        value={filterFrom}
        onChange={(e) => setFilterFrom(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
      />
    </div>

    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
        To
      </label>
      <input
        placeholder="Arrival city"
        value={filterTo}
        onChange={(e) => setFilterTo(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
      />
    </div>

    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
        Journey Date
      </label>
      <input
        type="date"
        value={filterDate}
        onChange={(e) => setFilterDate(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
      />
    </div>

    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
        Train Class
      </label>
      <CustomSelect
        value={filterClass}
        onChange={setFilterClass}
        options={classOptions}
      />
    </div>

    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
        Price Range: ₹{filterPriceRange[0].toLocaleString()} – ₹{filterPriceRange[1].toLocaleString()}
      </label>
      <Slider.Root
        min={0}
        max={10000}
        step={200}
        value={filterPriceRange}
        onValueChange={setFilterPriceRange}
        className="relative flex items-center w-full h-5 mt-3"
      >
        <Slider.Track className="relative h-1.5 w-full grow rounded-full bg-gray-200">
          <Slider.Range className="absolute h-full rounded-full bg-black" />
        </Slider.Track>
        <Slider.Thumb className="block w-5 h-5 rounded-full bg-white border-2 border-black shadow focus:outline-none focus:ring-2 focus:ring-black/20 cursor-pointer" />
        <Slider.Thumb className="block w-5 h-5 rounded-full bg-white border-2 border-black shadow focus:outline-none focus:ring-2 focus:ring-black/20 cursor-pointer" />
      </Slider.Root>
    </div>

    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
        Min. Seats Available
      </label>
      <CustomSelect
        value={filterMinSeats}
        onChange={setFilterMinSeats}
        options={seatOptions}
      />
    </div>
  </>
);

// ── Page ───────────────────────────────────────────────────────────────────
const BrowseTicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");
  const [searchDate, setSearchDate] = useState("");

  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterClass, setFilterClass] = useState("Any class");
  const [filterPriceRange, setFilterPriceRange] = useState([0, 10000]);
  const [filterMinSeats, setFilterMinSeats] = useState("1+");

  const [sortBy, setSortBy] = useState("Price: Low to High");
  const [sortOpen, setSortOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const sortOptions = [
    "Price: Low to High",
    "Price: High to Low",
    "Earliest Departure",
    "Latest Departure",
  ];

  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [appliedDate, setAppliedDate] = useState("");

  useEffect(() => {
    const fetchTickets = async () => {
      const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setTickets(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchTickets();
  }, []);

  const handleSearch = () => {
    setAppliedFrom(searchFrom);
    setAppliedTo(searchTo);
    setAppliedDate(searchDate);
  };

  const handleSwap = () => {
    setSearchFrom(searchTo);
    setSearchTo(searchFrom);
  };

  const handleReset = () => {
    setFilterFrom("");
    setFilterTo("");
    setFilterDate("");
    setFilterClass("Any class");
    setFilterPriceRange([0, 10000]);
    setFilterMinSeats("1+");
  };

  const minSeatsNumber = parseInt(filterMinSeats) || 1;
  const seatCount = (seats) => {
    const n = parseInt(seats);
    return isNaN(n) ? 1 : n;
  };

  const filtered = useMemo(() => {
    let result = tickets.filter((t) => {
      if (appliedFrom && !t.from?.toLowerCase().includes(appliedFrom.toLowerCase())) return false;
      if (appliedTo && !t.to?.toLowerCase().includes(appliedTo.toLowerCase())) return false;
      if (appliedDate && t.journeyDate !== appliedDate) return false;
      if (filterFrom && !t.from?.toLowerCase().includes(filterFrom.toLowerCase())) return false;
      if (filterTo && !t.to?.toLowerCase().includes(filterTo.toLowerCase())) return false;
      if (filterDate && t.journeyDate !== filterDate) return false;
      if (filterClass !== "Any class" && t.trainClass !== filterClass) return false;
      if (Number(t.price) < filterPriceRange[0] || Number(t.price) > filterPriceRange[1]) return false;
      if (seatCount(t.seats) < minSeatsNumber) return false;
      return true;
    });
    if (sortBy === "Price: Low to High") result.sort((a, b) => Number(a.price) - Number(b.price));
    if (sortBy === "Price: High to Low") result.sort((a, b) => Number(b.price) - Number(a.price));
    if (sortBy === "Earliest Departure") result.sort((a, b) => (a.departureTime || "").localeCompare(b.departureTime || ""));
    if (sortBy === "Latest Departure") result.sort((a, b) => (b.departureTime || "").localeCompare(a.departureTime || ""));
    return result;
  }, [tickets, appliedFrom, appliedTo, appliedDate, filterFrom, filterTo, filterDate, filterClass, filterPriceRange, minSeatsNumber, sortBy]);

  const getDuration = (dep, arr) => {
    if (!dep || !arr) return null;
    const [dh, dm] = dep.split(":").map(Number);
    const [ah, am] = arr.split(":").map(Number);
    let mins = ah * 60 + am - (dh * 60 + dm);
    if (mins < 0) mins += 24 * 60;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  };

  const getInitials = (name) =>
    (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const filterFieldProps = {
    filterFrom, setFilterFrom,
    filterTo, setFilterTo,
    filterDate, setFilterDate,
    filterClass, setFilterClass,
    filterPriceRange, setFilterPriceRange,
    filterMinSeats, setFilterMinSeats,
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <svg className="animate-spin h-7 w-7 text-gray-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );

  return (
    <>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .compact-filters > div { margin-bottom: 0.625rem !important; }
        .compact-filters > div:last-child { margin-bottom: 0 !important; }
        .compact-filters label { margin-bottom: 0.25rem !important; font-size: 0.65rem !important; }
        .compact-filters input { padding-top: 0.4rem !important; padding-bottom: 0.4rem !important; }
      `}</style>

      <div className="h-screen flex flex-col overflow-hidden">

        {/* ── SEARCH BAR ── */}
        <div className="border-b border-gray-100 px-4 py-3 mt-[100px] flex-shrink-0 bg-white">
          {/* Mobile */}
          <div className="flex flex-col gap-2 md:hidden">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <MapPin size={14} />
                </span>
                <input
                  placeholder="From"
                  value={searchFrom}
                  onChange={(e) => setSearchFrom(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>
              <button
                onClick={handleSwap}
                className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 bg-white flex-shrink-0"
              >
                <ArrowLeftRight size={14} className="text-gray-500" />
              </button>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <MapPin size={14} />
                </span>
                <input
                  placeholder="To"
                  value={searchTo}
                  onChange={(e) => setSearchTo(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
              />
              <button
                onClick={handleSearch}
                className="flex items-center justify-center gap-1.5 bg-black text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-800 transition flex-shrink-0"
              >
                <Search size={14} />
                Search
              </button>
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden md:flex max-w-5xl mx-auto items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <MapPin size={15} />
              </span>
              <input
                placeholder="From"
                value={searchFrom}
                onChange={(e) => setSearchFrom(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
            <button
              onClick={handleSwap}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 hover:bg-gray-50 transition flex-shrink-0"
            >
              <ArrowLeftRight size={15} className="text-gray-500" />
            </button>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <MapPin size={15} />
              </span>
              <input
                placeholder="To"
                value={searchTo}
                onChange={(e) => setSearchTo(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
            <div className="relative flex-1">
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
            <button
              onClick={handleSearch}
              className="flex items-center justify-center gap-2 bg-black text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-gray-800 transition flex-shrink-0"
            >
              <Search size={15} />
              Search
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-hidden">

          {/* ══ MOBILE ══ */}
          <div className="h-full flex flex-col md:hidden overflow-y-auto hide-scrollbar">
            {/* Sticky bar */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-3 py-2.5 flex items-center justify-between gap-2">
              <p className="text-xs pl-3.5 sm:text-sm text-black font-medium whitespace-nowrap flex-shrink-0">
                {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setShowFilters(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition whitespace-nowrap flex-shrink-0 bg-white text-gray-700 border-gray-200"
                >
                  <SlidersHorizontal size={12} />
                  Filters
                </button>
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setSortOpen((v) => !v)}
                    className="flex items-center gap-1 border border-gray-200 rounded-xl pl-2.5 pr-2 py-1.5 text-xs bg-white font-medium text-gray-700 max-w-[120px]"
                  >
                    <span className="truncate">{sortBy}</span>
                    <ChevronDown
                      size={12}
                      className={`text-gray-400 flex-shrink-0 transition-transform ${sortOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {sortOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setSortOpen(false)} />
                      <div className="absolute right-0 mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
                        {sortOptions.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => { setSortBy(opt); setSortOpen(false); }}
                            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition"
                          >
                            <span className={sortBy === opt ? "font-semibold text-gray-900" : "text-gray-600"}>
                              {opt}
                            </span>
                            {sortBy === opt && <Check size={15} className="text-gray-900 flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile filter popup */}
            {showFilters && (
              <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
                <div
                  className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                  onClick={() => setShowFilters(false)}
                />
                <div className="relative mt-15 bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden">
                  <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
                    <KineticText
                      text="Filter Tickets"
                      className="text-[2.25rem] sm:text-[3.25rem] md:text-[4.5rem] tracking-[-5%] flex items-start justify-start"
                    />
                    <button onClick={() => setShowFilters(false)} className="text-gray-500">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 pt-3 pb-3 hide-scrollbar">
                    <div className="flex items-center justify-end mb-3">
                      <button
                        onClick={handleReset}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition"
                      >
                        <RotateCcw size={11} /> Reset
                      </button>
                    </div>
                    <div className="compact-filters">
                      <FilterFields {...filterFieldProps} />
                    </div>
                  </div>
                  <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100">
                    <button
                      onClick={() => setShowFilters(false)}
                      className="w-full bg-black text-white text-sm font-semibold py-3 rounded-xl hover:bg-gray-800 transition"
                    >
                      Apply Filters ({filtered.length} result{filtered.length !== 1 ? "s" : ""})
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Ticket cards */}
            <div className="px-4 py-4">
              {filtered.length === 0 ? (
                <div className="text-center py-20 text-gray-400 border border-gray-100 rounded-2xl">
                  <Search size={36} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No tickets match your search</p>
                  <p className="text-xs mt-1">Try adjusting filters or search terms</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 pb-8">
                  {filtered.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      duration={getDuration(ticket.departureTime, ticket.arrivalTime)}
                      initials={getInitials(ticket.fullName)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ══ DESKTOP ══ */}
          <div className="hidden md:flex h-full w-[90%] mx-auto px-4 py-6 gap-6">
            <aside className="w-64 flex-shrink-0 overflow-y-auto hide-scrollbar">
              <div className="border border-gray-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-gray-900">Filters</h2>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition"
                  >
                    <RotateCcw size={12} /> Reset
                  </button>
                </div>
                <FilterFields {...filterFieldProps} />
              </div>
            </aside>

            <div className="flex-1 min-w-0 overflow-y-auto hide-scrollbar">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-black font-medium">
                  {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
                </p>
                <div className="relative">
                  <button
                    onClick={() => setSortOpen((v) => !v)}
                    className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2 text-sm bg-white font-medium min-w-[180px] justify-between"
                  >
                    <span>{sortBy}</span>
                    <ChevronDown
                      size={13}
                      className={`text-gray-400 transition-transform ${sortOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {sortOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setSortOpen(false)} />
                      <div className="absolute right-0 mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
                        {sortOptions.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => { setSortBy(opt); setSortOpen(false); }}
                            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition"
                          >
                            <span className={sortBy === opt ? "font-semibold text-gray-900" : "text-gray-600"}>
                              {opt}
                            </span>
                            {sortBy === opt && <Check size={15} className="text-gray-900 flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-24 text-gray-400 border border-gray-100 rounded-2xl">
                  <Search size={36} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No tickets match your search</p>
                  <p className="text-xs mt-1">Try adjusting filters or search terms</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-6">
                  {filtered.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      duration={getDuration(ticket.departureTime, ticket.arrivalTime)}
                      initials={getInitials(ticket.fullName)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/* ── Ticket card ── */
const TicketCard = ({ ticket, duration, initials }) => (
  <div className="border border-gray-200 rounded-2xl p-5 hover:shadow-md transition bg-white">
    <div className="flex items-start justify-between mb-3">
      <div>
        <h3 className="font-bold text-gray-900 text-sm">{ticket.trainName || "—"}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{ticket.trainNumber || ""}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">
          {ticket.trainClass}
        </span>
        <span className="text-xs bg-black text-white px-2.5 py-1 rounded-full">Active</span>
      </div>
    </div>

    <div className="flex items-center gap-3 mb-3">
      <div>
        <p className="text-xl font-bold text-gray-900">{ticket.departureTime || "—"}</p>
        <p className="text-xs text-gray-500">{ticket.from || "—"}</p>
      </div>
      <div className="flex-1 flex flex-col items-center gap-0.5">
        {duration && <span className="text-xs text-gray-400">{duration}</span>}
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

    <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
          {initials}
        </div>
        <p className="text-sm font-medium text-gray-900">{ticket.fullName || "—"}</p>
      </div>
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

export default BrowseTicketsPage;