import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { db } from "../firebase";
import { collection,onSnapshot, orderBy, query } from "firebase/firestore";
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
          bg-[var(--color-surface)] text-[var(--color-text)] transition-all
          focus:outline-none focus:ring-2 focus:ring-[var(--ring)]
          hover:bg-[var(--color-bg)] hover:border-[var(--color-text-subtle)]
          ${open ? "border-[var(--color-text-subtle)] bg-[var(--color-bg)]" : "border-[var(--color-border)]"}
        `}
      >
        <span className="text-[var(--color-text)] truncate">{value}</span>
        <ChevronDown
          size={13}
          className={`text-[var(--color-text-subtle)] flex-shrink-0 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="bg-white dark:bg-black border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden py-1"
          >
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--color-surface-hover)] transition"
              >
                <span
                  className={
                    value === opt
                      ? "font-semibold text-[var(--color-text)]"
                      : "text-[var(--color-text-muted)]"
                  }
                >
                  {opt}
                </span>
                {value === opt && (
                  <Check size={13} className="text-[var(--color-text)] flex-shrink-0" />
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
      <label className="block text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wide mb-1.5">
        From
      </label>
      <input
        placeholder="Departure city"
        value={filterFrom}
        onChange={(e) => setFilterFrom(e.target.value)}
        className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
      />
    </div>

    <div className="mb-4">
      <label className="block text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wide mb-1.5">
        To
      </label>
      <input
        placeholder="Arrival city"
        value={filterTo}
        onChange={(e) => setFilterTo(e.target.value)}
        className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
      />
    </div>

    <div className="mb-4">
      <label className="block text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wide mb-1.5">
        Journey Date
      </label>
      <input
        type="date"
        value={filterDate}
        onChange={(e) => setFilterDate(e.target.value)}
        className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
      />
    </div>

    <div className="mb-4">
      <label className="block text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wide mb-1.5">
        Train Class
      </label>
      <CustomSelect
        value={filterClass}
        onChange={setFilterClass}
        options={classOptions}
      />
    </div>

    <div className="mb-4">
      <label className="block text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wide mb-1.5">
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
        <Slider.Track className="relative h-1.5 w-full grow rounded-full bg-[var(--color-surface-hover)]">
          <Slider.Range className="absolute h-full rounded-full bg-[var(--slider)]" />
        </Slider.Track>
        <Slider.Thumb className="block w-5 h-5 rounded-full bg-[var(--color-bg)] border-2 border-[var(--primary)] shadow focus:outline-none focus:ring-2 focus:ring-[var(--ring)] cursor-pointer" />
        <Slider.Thumb className="block w-5 h-5 rounded-full bg-[var(--color-bg)] border-2 border-[var(--primary)] shadow focus:outline-none focus:ring-2 focus:ring-[var(--ring)] cursor-pointer" />
      </Slider.Root>
    </div>

    <div>
      <label className="block text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wide mb-1.5">
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
  const q = query(
    collection(db, "tickets"),
    orderBy("createdAt", "desc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    setTickets(
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    );

    setLoading(false);
  });

  return () => unsubscribe();
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
      if (t.sold) return true; // sold tickets skip seat filter — they show regardless
      if (seatCount(t.seats) < minSeatsNumber) return false;
      return true;
    });
    if (sortBy === "Price: Low to High") result.sort((a, b) => Number(a.price) - Number(b.price));
    if (sortBy === "Price: High to Low") result.sort((a, b) => Number(b.price) - Number(a.price));
    if (sortBy === "Earliest Departure") result.sort((a, b) => (a.departureTime || "").localeCompare(b.departureTime || ""));
    if (sortBy === "Latest Departure") result.sort((a, b) => (b.departureTime || "").localeCompare(a.departureTime || ""));
    // Push sold tickets to the end always
    result.sort((a, b) => (a.sold ? 1 : 0) - (b.sold ? 1 : 0));
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <svg className="animate-spin h-7 w-7 text-[var(--color-text-subtle)]" viewBox="0 0 24 24" fill="none">
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

      <div className="h-screen flex flex-col overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">

        {/* ── SEARCH BAR ── */}
        <div className="border-b border-[var(--color-border)] px-3 sm:px-4 py-2.5 sm:py-3 mt-16 sm:mt-20 md:mt-[100px] flex-shrink-0 bg-[var(--color-bg)]">
          {/* Mobile */}
          <div className="flex flex-col gap-2 md:hidden max-w-3xl md:max-w-none mx-auto w-full">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]">
                  <MapPin size={14} />
                </span>
                <input
                  placeholder="From"
                  value={searchFrom}
                  onChange={(e) => setSearchFrom(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-sm border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
              <button
                onClick={handleSwap}
                className="flex items-center justify-center w-9 h-9 rounded-full border border-[var(--color-border)] bg-[var(--color-bg) flex-shrink-0"
              >
                <ArrowLeftRight size={14} className="text-black dark:text-white" />
              </button>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]">
                  <MapPin size={14} />
                </span>
                <input
                  placeholder="To"
                  value={searchTo}
                  onChange={(e) => setSearchTo(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-sm border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
              <button
                onClick={handleSearch}
                className="flex items-center justify-center gap-1.5 bg-[#FF6B1A] text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:brightness-90 active:brightness-75 transition flex-shrink-0 "
              >
                <Search size={14} />
                Search
              </button>
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden md:flex max-w-5xl mx-auto items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]">
                <MapPin size={15} />
              </span>
              <input
                placeholder="From"
                value={searchFrom}
                onChange={(e) => setSearchFrom(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <button
              onClick={handleSwap}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition flex-shrink-0"
            >
              <ArrowLeftRight size={15} className="text-black dark:text-white" />
            </button>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]">
                <MapPin size={15} />
              </span>
              <input
                placeholder="To"
                value={searchTo}
                onChange={(e) => setSearchTo(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div className="relative flex-1">
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <button
              onClick={handleSearch}
              className="flex items-center justify-center gap-2 bg-[#FF6B1A] text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:brightness-90 active:brightness-75 transition flex-shrink-0"
            >
              <Search size={15} />
              Search
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-hidden">

          {/* ══ MOBILE ══ */}
          <div className="h-full flex flex-col lg:hidden overflow-y-auto hide-scrollbar">
            {/* Sticky bar */}
            <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-[var(--color-border)] px-3 sm:px-4 md:px-6 py-2.5 flex items-center justify-between gap-2 max-w-3xl md:max-w-none mx-auto w-full">
              <p className="text-xs pl-1 sm:pl-2 sm:text-sm text-[var(--color-text)] font-medium whitespace-nowrap flex-shrink-0">
                {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowFilters(true)}
                  className="flex items-center gap-1.5 border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs sm:text-sm bg-[var(--color-surface)] font-medium text-[var(--color-text)] whitespace-nowrap flex-shrink-0"
                >
                  <SlidersHorizontal size={13} className="text-[var(--color-text-subtle)]" />
                  Filters
                </button>
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setSortOpen((v) => !v)}
                    className="flex items-center gap-2 border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs sm:text-sm bg-[var(--color-surface)] text-[var(--color-text)] font-medium max-w-[130px] sm:max-w-[200px] justify-between"
                  >
                    <span className="truncate">{sortBy}</span>
                    <ChevronDown
                      size={13}
                      className={`text-[var(--color-text-subtle)] flex-shrink-0 transition-transform ${sortOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {sortOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setSortOpen(false)} />
                      <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-black border border-[var(--color-border)] rounded-xl shadow-lg z-30 overflow-hidden">
                        {sortOptions.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => { setSortBy(opt); setSortOpen(false); }}
                            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left hover:bg-[var(--color-surface-hover)] transition"
                          >
                            <span className={sortBy === opt ? "font-semibold text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}>
                              {opt}
                            </span>
                            {sortBy === opt && <Check size={15} className="text-[var(--color-text)] flex-shrink-0" />}
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
              <div className="fixed inset-0 z-40 flex items-center  justify-center p-4">
                <div
                  className="absolute h-[100vh] inset-0 bg-black/30 backdrop-blur-sm"
                  onClick={() => setShowFilters(false)}
                />
                <div className="relative mt-15 bg-white dark:bg-black rounded-2xl shadow-xl w-full max-w-sm md:max-w-md max-h-[85vh] sm:max-h-[80vh] font-mono flex flex-col overflow-hidden border border-[var(--color-border)]">
                  <div className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-[var(--color-border)] flex items-center justify-between">
                    <h2 className="text-base font-semibold text-[var(--color-text)]">Filters</h2>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleReset}
                        className="flex items-center gap-1 text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition"
                      >
                        <RotateCcw size={12} /> Reset
                      </button>
                      <button onClick={() => setShowFilters(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition">
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-5 pt-4 pb-4 hide-scrollbar">
                    <div className="compact-filters">
                      <FilterFields {...filterFieldProps} />
                    </div>
                  </div>
                  <div className="flex-shrink-0 px-5 py-4 border-t border-[var(--color-border)]">
                    <button
                      onClick={() => setShowFilters(false)}
                      className="w-full bg-[#FF6B1A] text-white text-sm font-semibold py-3 rounded-xl hover:brightness-90 active:brightness-75 transition"
                    >
                      Apply Filters ({filtered.length} result{filtered.length !== 1 ? "s" : ""})
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Ticket cards */}
            <div className="px-3 sm:px-4 md:px-6 py-4 max-w-3xl md:max-w-none mx-auto w-full">
              {filtered.length === 0 ? (
                <div className="text-center py-16 sm:py-20 text-[var(--color-text-subtle)] border border-[var(--color-border)] rounded-2xl">
                  <Search size={36} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No tickets match your search</p>
                  <p className="text-xs mt-1">Try adjusting filters or search terms</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
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
          <div className="hidden lg:flex h-full w-[92%] xl:w-[90%] mx-auto px-4 py-6 gap-6">
            <aside className="w-56 xl:w-64 flex-shrink-0 overflow-y-auto hide-scrollbar">
              <div className="border border-[var(--color-border)] font-mono rounded-2xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base  font-semibold text-[var(--color-text)]">Filters</h2>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition"
                  >
                    <RotateCcw size={12} /> Reset
                  </button>
                </div>
                <FilterFields {...filterFieldProps} />
              </div>
            </aside>

            <div className="flex-1 min-w-0 overflow-y-auto hide-scrollbar">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-[var(--color-text)] font-medium">
                  {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
                </p>
                <div className="relative">
                  <button
                    onClick={() => setSortOpen((v) => !v)}
                    className="flex items-center gap-2 border border-[var(--color-border)] rounded-xl px-4 py-2 text-sm bg-[var(--color-surface)] text-[var(--color-text)] font-medium min-w-[180px] justify-between"
                  >
                    <span>{sortBy}</span>
                    <ChevronDown
                      size={13}
                      className={`text-[var(--color-text-subtle)] transition-transform ${sortOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {sortOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setSortOpen(false)} />
                      <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-black border border-[var(--color-border)] rounded-xl shadow-lg z-30 overflow-hidden">
                        {sortOptions.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => { setSortBy(opt); setSortOpen(false); }}
                            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left hover:bg-[var(--color-surface-hover)] transition"
                          >
                            <span className={sortBy === opt ? "font-semibold text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}>
                              {opt}
                            </span>
                            {sortBy === opt && <Check size={15} className="text-[var(--color-text)] flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-24 text-[var(--color-text-subtle)] border border-[var(--color-border)] rounded-2xl">
                  <Search size={36} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No tickets match your search</p>
                  <p className="text-xs mt-1">Try adjusting filters or search terms</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4 pb-6">
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

// ── Ticket card ────────────────────────────────────────────────────────────
const TicketCard = ({ ticket, duration, initials }) => {
  const navigate = useNavigate();
  const isSold = !!ticket.sold;

  return (
    <div className={`border rounded-2xl p-4 sm:p-5 hover:shadow-md transition ${
      isSold
        ? "bg-yellow-50 border-2 border-yellow-300"
        : "bg-green-50 border-2 border-green-200"
    }`}>


      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0">
          <h3 className={`font-bold text-sm font-mono truncate ${isSold ? "text-yellow-900" : "text-green-900"}`}>
            {ticket.trainName || "—"}
          </h3>
          <p className="text-xs font-mono text-gray-400 mt-0.5">{ticket.trainNumber || ""}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-xs border px-2.5 py-1 rounded-full whitespace-nowrap ${
            isSold
              ? "border-yellow-300 text-yellow-700 bg-yellow-50"
              : "border-green-200 text-green-700 bg-green-50"
          }`}>
            {ticket.trainClass}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${
            isSold
              ? "bg-yellow-400 text-yellow-900"
              : "bg-green-600 text-white"
          }`}>
            {isSold ? "Sold" : "Active"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 mb-3">
        <div className="min-w-0">
          <p className={`text-lg sm:text-xl font-bold font-mono ${isSold ? "text-yellow-800" : "text-green-900"}`}>
            {ticket.departureTime || "—"}
          </p>
          <p className="text-xs font-mono text-gray-500 truncate">{ticket.from || "—"}</p>
        </div>
        <div className="flex-1 flex flex-col items-center gap-0.5 min-w-[40px]">
          {duration && <span className="text-xs text-gray-400 whitespace-nowrap">{duration}</span>}
          <div className="flex items-center w-full gap-1">
            <div className={`flex-1 h-px ${isSold ? "bg-yellow-300" : "bg-green-300"}`} />
            <span className={`text-xs ${isSold ? "text-yellow-500" : "text-green-900"}`}>→</span>
            <div className={`flex-1 h-px ${isSold ? "bg-yellow-300" : "bg-green-300"}`} />
          </div>
        </div>
        <div className="text-right min-w-0">
          <p className={`text-lg sm:text-xl font-bold font-mono ${isSold ? "text-yellow-800" : "text-green-900"}`}>
            {ticket.arrivalTime || "—"}
          </p>
          <p className="text-xs font-mono text-gray-500 truncate">{ticket.to || "—"}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mb-4">
        <div className="flex font-mono items-center gap-1">
          <Clock size={12} />
          <span>{ticket.journeyDate || "—"}</span>
        </div>
        <span>·</span>
        <div className="flex font-mono items-center gap-1">
          <Users size={12} />
          <span>{ticket.seats} available</span>
        </div>
      </div>

      <div className={`border-t pt-3 flex items-center justify-between gap-2 ${
        isSold ? "border-yellow-200" : "border-green-200"
      }`}>
        <div className="flex items-center gap-2 min-w-0">
{ticket.listerPhoto ? (
  <img
    src={ticket.listerPhoto}
    alt={ticket.fullName}
    className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0"
  />
) : (
  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
    {initials}
  </div>
)}
          <p className="text-sm font-medium text-gray-900 truncate">{ticket.fullName || "—"}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className={`text-sm sm:text-base font-bold font-mono ${isSold ? "text-yellow-800" : "text-green-900"}`}>
              ₹{ticket.price}
            </p>
            <p className="text-[10px] font-mono text-gray-400">per seat</p>
          </div>
          <button
            onClick={() => !isSold && navigate(`/ticket/${ticket.id}`)}
            disabled={isSold}
            className={`text-xs font-medium px-3 sm:px-4 py-2 rounded-lg transition whitespace-nowrap ${
              isSold
                ? "bg-yellow-200 text-yellow-700 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {isSold ? "Sold out" : "View"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrowseTicketsPage;