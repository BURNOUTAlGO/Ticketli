import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { db } from "../firebase";
import {
  collection, addDoc, serverTimestamp,
  query, where, getDocs, doc, getDoc,
} from "firebase/firestore";

import {
  ChevronLeft, ChevronRight,  Train, Ticket,
  User, ChevronDown, Check, Search, CheckCircle, AlertCircle,
} from "lucide-react";
import { KineticText } from "@/components/ui/kinetic-text";

// ── Reusable components ────────────────────────────────────────────────────
const Label = ({ children, required }) => (
  <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">
    {children}
    {required && <span className="ml-1" style={{ color: "var(--rail-orange)" }}>*</span>}
  </label>
);

const Input = ({ error, hint, ...props }) => (
  <div>
    <input
      className={`
        rail-focus w-full border rounded-lg px-3 py-2.5 text-sm bg-[var(--color-surface)] text-[var(--color-text)]
        placeholder:text-[var(--color-text-subtle)]
        transition-colors
        ${error ? "border-red-400" : "border-[var(--color-border)]"}
        ${props.readOnly || props.disabled
          ? "bg-[var(--color-surface-hover)] text-[var(--color-text-subtle)] cursor-not-allowed"
          : ""}
      `}
      {...props}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    {hint  && <p className="text-[var(--color-text-subtle)] text-xs mt-1">{hint}</p>}
  </div>
);

// ── Shared styles (theme tokens + animations) ──────────────────────────────
const ThemeStyles = () => (
  <style>{`
    :root {
      --rail-orange: #FF6B1A;
      --rail-orange-dim: #FF6B1A1a;
      --rail-orange-mid: #FF6B1A40;
      --navbar-height: 64px;
    }
    @media (max-width: 639px) {
      :root { --navbar-height: 56px; }
    }
    @keyframes stampIn {
      0%   { transform: scale(2.2) rotate(-14deg); opacity: 0; }
      60%  { transform: scale(0.92) rotate(-4deg); opacity: 1; }
      100% { transform: scale(1) rotate(-4deg); opacity: 1; }
    }
    @keyframes checkPop {
      0%   { transform: scale(0); opacity: 0; }
      70%  { transform: scale(1.15); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(24px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(-24px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes dashTravel {
      to { stroke-dashoffset: -16; }
    }
    @keyframes pulseRing {
      0%   { box-shadow: 0 0 0 0 var(--rail-orange-mid); }
      100% { box-shadow: 0 0 0 8px transparent; }
    }
    .rail-step-fwd  { animation: slideInRight 0.32s cubic-bezier(0.22, 1, 0.36, 1); }
    .rail-step-back { animation: slideInLeft 0.32s cubic-bezier(0.22, 1, 0.36, 1); }
    .rail-fade-up   { animation: fadeUp 0.35s ease both; }
    .rail-stamp     { animation: stampIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
    .rail-check-pop { animation: checkPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
    .rail-route-dash {
      stroke-dasharray: 4 4;
      animation: dashTravel 0.8s linear infinite;
    }
    .rail-btn-primary {
      background: var(--rail-orange);
      color: #ffffff;
    }
    .rail-btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
    .rail-btn-primary:active:not(:disabled) { filter: brightness(0.92); }
    .rail-focus:focus {
      outline: none;
      box-shadow: 0 0 0 3px var(--rail-orange-mid);
      border-color: var(--rail-orange);
    }
    .rail-ticket-card {
      position: relative;
      background: var(--color-bg);
      border: 1.5px solid var(--color-border);
      border-radius: 16px;
      overflow: hidden;
    }
    .rail-perforation {
      position: relative;
      border-top: 1.5px dashed var(--color-border);
    }
    .rail-perforation::before,
    .rail-perforation::after {
      content: "";
      position: absolute;
      top: -9px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--rail-page-bg, var(--color-bg));
      border: 1.5px solid var(--color-border);
    }
    .rail-perforation::before { left: -10px; }
    .rail-perforation::after  { right: -10px; }
    .rail-progress-track {
      background: var(--color-surface-hover);
    }
    .rail-progress-fill {
      background: var(--rail-orange);
      transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    }
    @media (prefers-reduced-motion: reduce) {
      .rail-step-fwd, .rail-step-back, .rail-fade-up, .rail-stamp, .rail-check-pop {
        animation: none !important;
      }
      .rail-route-dash { animation: none !important; }
    }
  `}</style>
);

// ── Portal-based custom dropdown ───────────────────────────────────────────
const CustomSelect = ({ value, onChange, options, disabled }) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const btnRef  = useRef(null);
  const menuRef = useRef(null);

  const calcPosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect          = btnRef.current.getBoundingClientRect();
    const viewportH     = window.innerHeight;
    const spaceBelow    = viewportH - rect.bottom;
    const menuHeight    = Math.min(options.length * 38 + 8, 220);
    const openUpward    = spaceBelow < menuHeight + 8 && rect.top > menuHeight + 8;
    setMenuStyle({
      position : "fixed",
      left     : rect.left,
      width    : rect.width,
      zIndex   : 9999,
      ...(openUpward
        ? { bottom: viewportH - rect.top + 5 }
        : { top: rect.bottom + 5 }),
    });
  }, [options.length]);

  const handleOpen = () => {
    if (disabled) return;
    if (!open) calcPosition();
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onScroll = () => calcPosition();
    const onResize = () => calcPosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize",  onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize",  onResize);
    };
  }, [open, calcPosition]);

  useEffect(() => {
    if (!open) return;
    const handler = e => {
      if (
        btnRef.current  && !btnRef.current.contains(e.target)  &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) setOpen(false);
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
          rail-focus w-full flex items-center justify-between gap-2 border rounded-lg
          px-3 py-2.5 text-sm text-left transition-all
          ${disabled
            ? "bg-[var(--color-surface-hover)] text-[var(--color-text-subtle)] cursor-not-allowed border-[var(--color-border)]"
            : `bg-[var(--color-surface)] hover:bg-[var(--color-bg)] hover:border-[var(--color-text-subtle)]
               ${open ? "border-[var(--color-border)] bg-[var(--color-bg)]" : "border-[var(--color-border)]"}`
          }
        `}
        style={open ? { borderColor: "var(--rail-orange)" } : undefined}
      >
        <span className="text-[var(--color-text)] truncate">{value}</span>
        {!disabled && (
          <ChevronDown
            size={13}
            className={`text-[var(--color-text-subtle)] flex-shrink-0 transition-transform duration-150
              ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && !disabled && createPortal(
        <div
          ref={menuRef}
          style={menuStyle}
          className="bg-white dark:bg-black border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden py-1"
        >
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2
                         text-sm text-left hover:bg-[var(--color-surface-hover)] transition"
            >
              <span className={value === opt
                ? "font-semibold text-[var(--color-text)]"
                : "text-[var(--color-text-muted)]"}>
                {opt}
              </span>
              {value === opt && (
                <Check size={13} className="flex-shrink-0" style={{ color: "var(--rail-orange)" }} />
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

const classOptions = ["3E", "Sleeper", "AC 3-Tier", "AC 2-Tier", "First AC"];
const seatOptions  = ["1 seat", "2 seats", "3 seats", "4 seats"];

const mapClass = code => {
  const map = {
    SL: "Sleeper", "3A": "AC 3-Tier", "2A": "AC 2-Tier",
    "1A": "First AC", CC: "3E", EC: "3E", "2S": "3E", GN: "3E",
  };
  return map[code] || "3E";
};

// ── Ticket Stub: persistent live preview ───────────────────────────────────
const StubField = ({ label, value, mono = true, className = "" }) => (
  <div className={className}>
    <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-subtle)] mb-0.5">{label}</p>
    <p className={`text-xs font-semibold text-[var(--color-text)] truncate ${mono ? "font-mono" : ""}`}>
      {value || "—"}
    </p>
  </div>
);

const TicketStub = ({ formData, step }) => {
  const hasRoute = formData.from && formData.to;
  const verified = !!formData.pnrNumber;

  return (
    <div className="rail-ticket-card rail-fade-up">
      {/* Header strip */}
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ background: "var(--rail-orange)" }}
      >
        <div className="flex items-center gap-1.5">
          <Train size={14} className="text-white" />
          <span className="text-xs font-bold text-white tracking-wide">E-TICKET PREVIEW</span>
        </div>
        {verified && (
          <div className="rail-check-pop flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
            <Check size={11} className="text-white" />
            <span className="text-[10px] font-semibold text-white">VERIFIED</span>
          </div>
        )}
      </div>

      <div className="p-4">
        {/* PNR row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-subtle)] mb-0.5">PNR Number</p>
            <p className="text-sm font-bold font-mono tracking-widest text-[var(--color-text)]">
              {formData.pnrNumber || "0000000000"}
            </p>
          </div>
          {verified && (
            <div
              className="rail-stamp flex items-center justify-center w-12 h-12 rounded-full border-2 flex-shrink-0"
              style={{ borderColor: "var(--rail-orange)", color: "var(--rail-orange)", transform: "rotate(-4deg)" }}
            >
              <Check size={20} strokeWidth={3} />
            </div>
          )}
        </div>

        {/* Train name/number */}
        <div className="mb-3">
          <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-subtle)] mb-0.5">Train</p>
          <p className="text-sm font-semibold text-[var(--color-text)] truncate">
            {formData.trainName
              ? `${formData.trainName}${formData.trainNumber ? ` · ${formData.trainNumber}` : ""}`
              : "—"}
          </p>
        </div>

        {/* Route visualization */}
        <div className="flex items-center gap-2 mb-3 ">
          <div className="min-w-0 flex-shrink-0 max-w-[40%] ">
            <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-subtle)] mb-0.5">From</p>
            <p className="text-sm font-bold text-[var(--color-text)] truncate">{formData.from || "—"}</p>
          </div>
          <svg viewBox="0 0 60 12" className="h-[12%] flex-1 rounded-2xl  " preserveAspectRatio="none">
            <line
              x1="2" y1="6" x2="52" y2="6"
              stroke={hasRoute ? "var(--rail-orange)" : "var(--color-border)"}
              strokeWidth="1.5"
              className={hasRoute ? "rail-route-dash" : ""}
              strokeDasharray={hasRoute ? "4 4" : "0"}
            />
            
            <path
              d="M52 2 L58 6 L52 10"
              fill="none"
              stroke={hasRoute ? "var(--rail-orange)" : "var(--color-border)"}
              strokeWidth="1"
              strokeLinecap="round"
              
           
             
            />
          </svg>
          <div className="min-w-0 flex-shrink-0 max-w-[40%] text-right">
            <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-subtle)] mb-0.5">To</p>
            <p className="text-sm font-bold text-[var(--color-text)] truncate">{formData.to || "—"}</p>
          </div>
        </div>

        {/* Date / time grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <StubField label="Date" value={formData.journeyDate} />
          <StubField label="Depart" value={formData.departureTime} />
          <StubField label="Arrive" value={formData.arrivalTime} />
        </div>

        {/* Perforated divider */}
        <div className="rail-perforation my-3" />

        {/* Class / seats / price */}
        <div className="grid grid-cols-3 gap-2 mb-1">
          <StubField label="Class" value={formData.trainClass} mono={false} />
          <StubField label="Seats" value={formData.seats} mono={false} />
          <StubField
            label="Price"
            value={formData.price ? `₹${formData.price}` : null}
            className=""
          />
        </div>

        {step >= 3 && formData.fullName && (
          <>
            <div className="rail-perforation my-3" />
            <StubField label="Passenger" value={formData.fullName} mono={false} />
          </>
        )}
      </div>
    </div>
  );
};

// ── PNR Verification Step ──────────────────────────────────────────────────
const PNRStep = ({ onVerified }) => {
  const [pnr,     setPnr]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [pnrData, setPnrData] = useState(null);

  const verifyPNR = async () => {
    const trimmed = pnr.trim();
    if (!/^\d{10}$/.test(trimmed)) { setError("PNR must be exactly 10 digits"); return; }

    setLoading(true); setError(""); setPnrData(null);

    try {
      const soldSnap = await getDoc(doc(db, "soldPnrs", trimmed));
      if (soldSnap.exists()) {
        setError("This ticket has already been sold and cannot be re-listed.");
        return;
      }

      const existingSnap = await getDocs(
        query(collection(db, "tickets"), where("pnrNumber", "==", trimmed))
      );
      if (!existingSnap.empty) {
        const isSold = existingSnap.docs[0].data().sold === true;
        setError(isSold
          ? "This ticket has already been marked as sold and cannot be re-listed."
          : "This PNR has already been listed. Each ticket can only be listed once.");
        return;
      }

      const res  = await fetch(
        `https://irctc-indian-railway-pnr-status.p.rapidapi.com/getPNRStatus/${trimmed}`,
        {
          method  : "GET",
          headers : {
            "x-rapidapi-key"  : import.meta.env.VITE_RAPIDAPI_KEY,
            "x-rapidapi-host" : "irctc-indian-railway-pnr-status.p.rapidapi.com",
            "Content-Type"    : "application/json",
          },
        }
      );
      const json = await res.json();

      if (!json.success || !json.data) {
        setError("Invalid PNR or ticket not found. Please check and try again.");
        return;
      }

      const data = json.data;
      const isCancelled =
        Array.isArray(data.passengerList) &&
        data.passengerList.length > 0 &&
        data.passengerList.every(p => p.currentStatus === "CAN");

      if (isCancelled) { setError("This ticket has been cancelled and cannot be listed."); return; }

      setPnrData(data);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!pnrData) return;

    let journeyDate = "", departureTime = "";
    try {
      const parsed = new Date(pnrData.dateOfJourney || "");
      if (!isNaN(parsed)) {
        journeyDate   = parsed.toISOString().split("T")[0];
        departureTime = parsed.toTimeString().slice(0, 5);
      }
    } catch {}

    let arrivalTime = "";
    try {
      const parsed = new Date(pnrData.arrivalDate || "");
      if (!isNaN(parsed)) arrivalTime = parsed.toTimeString().slice(0, 5);
    } catch {}

    const numSeats   = pnrData.numberOfpassenger || 1;
    const seatsStr   = `${numSeats} seat${numSeats > 1 ? "s" : ""}`;
    const clampedSeats = seatOptions.includes(seatsStr) ? seatsStr : "1 seat";

    onVerified({
      pnrNumber          : pnrData.pnrNumber || pnr.trim(),
      trainName          : pnrData.trainName  || "",
      trainNumber        : pnrData.trainNumber || "",
      from               : pnrData.sourceStation || "",
      to                 : pnrData.destinationStation || "",
      journeyDate,
      departureTime,
      arrivalTime,
      trainClass         : mapClass(pnrData.journeyClass),
      seats              : clampedSeats,
      bookingFare        : pnrData.bookingFare || 0,
      numberOfPassengers : pnrData.numberOfpassenger || 1,
    });
  };

  return (
    <div className="rail-ticket-card font-mono p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-bold text-[var(--color-text)]">Verify your ticket</h2>
      <p className="text-xs sm:text-sm text-[#c9c9c9] dark:text-[var(--color-text-subtle)] mt-1 mb-4 sm:mb-6">
        Enter your 10-digit PNR number to auto-fill journey details. Each PNR can only be listed once.
      </p>

      <Label required>PNR Number</Label>

      {/* Stack on very small screens, row on sm+ */}
      <div className="flex flex-col xs:flex-row gap-2 mb-4">
        <input
          placeholder="e.g. 8524877966"
          value={pnr}
          onChange={e => { setPnr(e.target.value.replace(/\D/g, "")); setError(""); setPnrData(null); }}
          maxLength={10}
          className={`
            rail-focus flex-1 min-w-0 border rounded-lg px-3 py-2.5 text-sm bg-[var(--color-surface)] text-[var(--color-text)]
            placeholder:text-[var(--color-text-subtle)]
            font-mono tracking-widest transition-colors
            ${error ? "border-red-400" : "border-[var(--color-border)]"}
          `}
        />
        <button
          onClick={verifyPNR}
          disabled={loading || pnr.length !== 10}
          className="rail-btn-primary flex items-center justify-center gap-1.5
                     text-sm font-medium px-4 py-2.5 rounded-lg
                     disabled:opacity-50 transition flex-shrink-0 w-full xs:w-auto"
        >
          {loading
            ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            : <Search size={15} />}
          {loading ? "Checking…" : "Verify"}
        </button>
      </div>

      {error && (
        <div className="rail-fade-up flex items-start gap-2 text-red-600 bg-red-50 border border-red-200
                        rounded-lg px-3 py-2.5 mb-4">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {pnrData && (
        <div className="rail-fade-up border border-[var(--color-border)] rounded-xl p-4 mb-4 bg-[var(--color-surface)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="rail-check-pop flex items-center justify-center w-5 h-5 rounded-full"
                 style={{ background: "var(--rail-orange)" }}>
              <Check size={12} className="text-white" strokeWidth={3} />
            </div>
            <p className="text-sm font-semibold text-[var(--color-text)]">PNR verified successfully</p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm mb-4">
            {[
              ["Train",      `${pnrData.trainName} (${pnrData.trainNumber})`],
              ["Class",      `${pnrData.journeyClass} → ${mapClass(pnrData.journeyClass)}`],
              ["From",       pnrData.sourceStation],
              ["To",         pnrData.destinationStation],
              ["Departure",  pnrData.dateOfJourney],
              ["Arrival",    pnrData.arrivalDate || "—"],
              ["Passengers", pnrData.numberOfpassenger],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs text-[#c9c9c9] dark:text-[var(--color-text-subtle)] mb-0.5">{label}</p>
                <p className="font-semibold text-[var(--color-text)] text-xs break-words">{val}</p>
              </div>
            ))}
          </div>

          <button
            onClick={handleConfirm}
            className="rail-btn-primary w-full flex items-center justify-center gap-2
                       text-sm font-medium py-2.5 rounded-lg transition"
          >
            <CheckCircle size={15} />
            Use this ticket's details
          </button>
        </div>
      )}

      {!pnrData && !error && (
        <p className="text-xs text-[#c9c9c9] dark:text-[var(--color-text-subtle)] mt-2">
          Your PNR number can be found on your train booking confirmation or ticket.
        </p>
      )}
    </div>
  );
};

// ── validateStep ───────────────────────────────────────────────────────────
const validateStep = (step, formData) => {
  const errors = {};

  if (step === 1) {
    if (!formData.from.trim())  errors.from = "Starting city is required";
    if (!formData.to.trim())    errors.to   = "Destination city is required";
    if (
      formData.from.trim() && formData.to.trim() &&
      formData.from.trim().toLowerCase() === formData.to.trim().toLowerCase()
    ) errors.to = "Destination must be different from starting city";

    if (!formData.trainName.trim())   errors.trainName   = "Train name is required";
    if (!formData.trainNumber.trim()) errors.trainNumber = "Train number is required";

    if (!formData.journeyDate) {
      errors.journeyDate = "Journey date is required";
    } else {
      const today = new Date(); today.setHours(0,0,0,0);
      const selected = new Date(formData.journeyDate);
      const minDate  = new Date(today); minDate.setDate(minDate.getDate() + 2);
      if (selected < today)   errors.journeyDate = "Journey date cannot be in the past";
      else if (selected < minDate) errors.journeyDate = "Journey date must be at least 2 days from today";
    }

    if (!formData.departureTime) errors.departureTime = "Departure time is required";
    if (!formData.arrivalTime)   errors.arrivalTime   = "Arrival time is required";
  }

  if (step === 2) {
    const perSeat   = Math.round((Number(formData.bookingFare) || 0) / (Number(formData.numberOfPassengers) || 1));
    const maxPrice  = perSeat + 250;
    if (!formData.price)                                errors.price = "Price is required";
    else if (!/^\d+$/.test(formData.price.toString().trim())) errors.price = "Price should be a whole number";
    else if (Number(formData.price) <= 0)               errors.price = "Price must be greater than 0";
    else if (Number(formData.price) > maxPrice)         errors.price = `Price cannot exceed ₹${maxPrice} (booking fare + ₹250)`;
  }

  if (step === 3) {
    if (!formData.fullName.trim())                          errors.fullName = "Full name is required";
    else if (!/^[a-zA-Z\s]+$/.test(formData.fullName.trim())) errors.fullName = "Name should contain only letters";
    else if (formData.fullName.trim().length < 3)           errors.fullName = "Name must be at least 3 characters";

    if (!formData.email.trim())                       errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))   errors.email = "Enter a valid email";

    if (!formData.phone.trim())                       errors.phone = "Phone number is required";
    else if (!/^\d{10}$/.test(formData.phone.trim())) errors.phone = "Phone number must be exactly 10 digits";
  }

  return errors;
};

// ── Step 1 ─────────────────────────────────────────────────────────────────
const Step1 = ({ formData, handleChange, errors }) => (
  <div className="rail-ticket-card font-mono p-4 sm:p-6">
    <h2 className="text-base sm:text-lg font-bold text-[var(--color-text)]">Journey details</h2>
    <p className="text-xs sm:text-sm text-[#c9c9c9] dark:text-[var(--color-text-subtle)] mt-1 mb-1 sm:mb-2">
      Journey details have been auto-filled from your PNR and are locked.
    </p>
    <div
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 mb-4 sm:mb-5 border"
      style={{ background: "var(--rail-orange-dim)", borderColor: "var(--rail-orange-mid)" }}
    >
      <CheckCircle size={13} className="flex-shrink-0" style={{ color: "var(--rail-orange)" }} />
      <p className="text-xs" style={{ color: "var(--rail-orange)" }}>Fields below are auto-filled from PNR and cannot be edited.</p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
      <div><Label required>From</Label><Input value={formData.from} readOnly error={errors.from} /></div>
      <div><Label required>To</Label>  <Input value={formData.to}   readOnly error={errors.to}   /></div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
      <div><Label required>Train Name</Label>  <Input value={formData.trainName}   readOnly error={errors.trainName}   /></div>
      <div><Label required>Train Number</Label><Input value={formData.trainNumber} readOnly error={errors.trainNumber} /></div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
      <div>
        <Label required>Journey Date</Label>
        <Input type="date" value={formData.journeyDate} readOnly error={errors.journeyDate} />
      </div>
      <div className="hidden sm:block" />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div>
        <Label required>Departure Time</Label>
        <Input type="time" value={formData.departureTime} readOnly error={errors.departureTime} />
      </div>
      <div>
        <Label required>Arrival Time</Label>
        <Input type="time" value={formData.arrivalTime} readOnly error={errors.arrivalTime} />
      </div>
    </div>
  </div>
);

// ── Step 2 ─────────────────────────────────────────────────────────────────
const Step2 = ({ formData, handleChange, errors }) => {
  const perSeat  = Math.round((Number(formData.bookingFare) || 0) / (Number(formData.numberOfPassengers) || 1));
  const maxPrice = perSeat + 250;

  return (
    <div className="rail-ticket-card font-mono p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-bold text-[var(--color-text)]">Ticket details</h2>
      <p className="text-xs sm:text-sm text-[#c9c9c9] dark:text-[var(--color-text-subtle)] mt-1 mb-4 sm:mb-6">
        Specify the number of seats and your asking price.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-5">
        <div>
          <Label required>Train Class</Label>
          <CustomSelect value={formData.trainClass} onChange={() => {}} options={classOptions} disabled />
          <p className="text-[#c9c9c9] dark:text-[var(--color-text-subtle)] text-xs mt-1">Auto-filled from PNR, cannot be changed.</p>
        </div>
        <div>
          <Label required>Number of Seats</Label>
          <CustomSelect value={formData.seats} onChange={() => {}} options={seatOptions} disabled />
          <p className="text-[#c9c9c9] dark:text-[var(--color-text-subtle)] text-xs mt-1">Auto-filled from PNR, cannot be changed.</p>
        </div>
      </div>

      <div className="mb-4 sm:mb-5">
        <Label required>Price per Seat (₹)</Label>
        <Input
          placeholder="e.g. 450"
          type="number"
          value={formData.price}
          onChange={handleChange("price")}
          error={errors.price}
          hint={!errors.price && formData.bookingFare
            ? `Max allowed: ₹${maxPrice} (₹${perSeat} per seat + ₹250)`
            : !errors.price ? "Set a fair price based on the original booking fare." : undefined}
        />
      </div>

      <div>
        <Label>Description</Label>
        <textarea
          placeholder="Any additional info buyers should know…"
          rows={3}
          value={formData.description}
          onChange={handleChange("description")}
          className="rail-focus w-full border border-[var(--color-border)] bg-[var(--color-surface)] rounded-lg px-3 py-2.5
                     text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] resize-none
                     transition-colors"
        />
      </div>
    </div>
  );
};

// ── Step 3 ─────────────────────────────────────────────────────────────────
const Step3 = ({ formData, handleChange, errors }) => (
  <div className="rail-ticket-card font-mono p-4 sm:p-6">
    <h2 className="text-base sm:text-lg font-bold text-[var(--color-text)]">Contact info</h2>
    <p className="text-xs sm:text-sm text-[#c9c9c9] dark:text-[var(--color-text-subtle)] mt-1 mb-4 sm:mb-6">
      How should buyers reach you?
    </p>

    <div className="mb-3 sm:mb-4 ">
      <Label required>Full Name</Label>
      <Input
        placeholder="e.g. Abhinav Maurya"
        value={formData.fullName}
        onChange={handleChange("fullName")}
        error={errors.fullName}
        
      />
    </div>

    <div className="mb-3 sm:mb-4">
      <Label required>Email</Label>
      <Input
        type="email"
        placeholder="e.g. thisisabhi@gmail.com"
        value={formData.email}
        readOnly
        error={errors.email}
        hint="This is your logged-in account email and cannot be changed here."
      />
    </div>

    <div>
      <Label required>Phone</Label>
      <Input
        type="tel"
        placeholder="e.g. 97951076XX"
        value={formData.phone}
        onChange={handleChange("phone")}
        error={errors.phone}
      />
    </div>
  </div>
);

// ── Step 4: Review ─────────────────────────────────────────────────────────
const ReviewRow = ({ label, value, muted = false }) => (
  <div className="flex items-start justify-between gap-3 py-2.5
                  border-b border-[var(--color-border)] last:border-b-0">
    <span className="text-sm text-sm text-[#c9c9c9] dark:text-[var(--color-text-subtle)] flex-shrink-0">{label}</span>
    <span className={`text-sm text-right break-all sm:break-words
      ${muted ? "text-[var(--color-text)]" : "font-semibold text-[var(--color-text)]"}`}>
      {value}
    </span>
  </div>
);

const Step4 = ({ formData }) => (
  <div className="rail-ticket-card font-mono p-4 sm:p-6">
    <h2 className="text-base  sm:text-lg font-bold text-[var(--color-text)]">Review your listing</h2>
    <p className="text-xs sm:text-sm text-[#c9c9c9] dark:text-[var(--color-text-subtle)] mt-1 mb-4 sm:mb-6">
      Confirm all details before publishing.
    </p>

    {formData.pnrNumber && (
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 mb-4 flex-wrap border"
        style={{ background: "var(--rail-orange-dim)", borderColor: "var(--rail-orange-mid)" }}
      >
        <CheckCircle size={14} className="flex-shrink-0" style={{ color: "var(--rail-orange)" }} />
        <p className="text-xs font-medium" style={{ color: "var(--rail-orange)" }}>
          PNR Verified: <span className="font-mono">{formData.pnrNumber}</span>
        </p>
      </div>
    )}

    {/* Journey */}
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Train size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
        <h3 className="text-sm font-bold text-[var(--color-text)]">Journey Details</h3>
      </div>
      <div className="border border-[var(--color-border)] rounded-lg px-3 sm:px-4">
        <ReviewRow label="Train"  value={
          formData.trainName || formData.trainNumber
            ? `${formData.trainName || "—"}${formData.trainNumber ? ` (${formData.trainNumber})` : ""}`
            : "—"} />
        <ReviewRow label="Route"  value={`${formData.from || "—"} → ${formData.to || "—"}`} />
        <ReviewRow label="Date"   value={formData.journeyDate || "—"} />
        <ReviewRow label="Timing" value={`${formData.departureTime || "—"} → ${formData.arrivalTime || "—"}`} />
      </div>
    </div>

    {/* Ticket */}
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Ticket size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
        <h3 className="text-sm font-bold text-[var(--color-text)]">Ticket Details</h3>
      </div>
      <div className="border border-[var(--color-border)] rounded-lg px-3 sm:px-4">
        <ReviewRow label="Class" value={formData.trainClass || "—"} />
        <ReviewRow label="Seats" value={formData.seats      || "—"} />
        <ReviewRow label="Price" value={formData.price ? `₹${formData.price} / seat` : "—"} />
      </div>
      {formData.description && (
        <p className="text-sm text-[var(--color-text-muted)] mt-2">{formData.description}</p>
      )}
    </div>

    {/* Contact */}
    <div>
      <div className="flex items-center gap-2 mb-2">
        <User size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
        <h3 className="text-sm font-bold text-[var(--color-text)]">Contact Info</h3>
      </div>
      <div className="border border-[var(--color-border)] rounded-lg px-3 sm:px-4">
        <ReviewRow label="Name"  value={formData.fullName || "—"} />
        <ReviewRow label="Phone" value={formData.phone    || "Not provided"} muted={!formData.phone} />
      </div>
    </div>
  </div>
);

// ── Page ───────────────────────────────────────────────────────────────────
const STEP_LABELS = ["Verify", "Journey", "Pricing", "Contact", "Review"];

const CreateListingPage = () => {
  const { user }                    = useAuth0();
  const [step,       setStep]       = useState(0);
  const [direction,  setDirection]  = useState("fwd");
  const [publishing, setPublishing] = useState(false);
  const [errors,     setErrors]     = useState({});
  const navigate                    = useNavigate();

  const [formData, setFormData] = useState({
    pnrNumber: "",
    from: "", to: "", trainName: "", trainNumber: "", journeyDate: "",
    departureTime: "", arrivalTime: "",
    trainClass: "3E", seats: "1 seat",
    price: "", description: "",
    bookingFare: 0,
    numberOfPassengers: 1,
    fullName: "", email: "", phone: "",
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email       : user.email   ? user.email.toLowerCase() : prev.email,
        listerPhoto : user.picture || prev.listerPhoto || null,
      }));
    }
  }, [user]);

  const handlePNRVerified = useCallback(pnrFields => {
    setFormData(prev => ({ ...prev, ...pnrFields }));
    setDirection("fwd");
    setStep(1);
  }, []);

  const handleChange = useCallback(field => e => {
    const value = e.target.value;
    setFormData(prev  => ({ ...prev,   [field]: value }));
    setErrors  (prev  => ({ ...prev,   [field]: undefined }));
  }, []);

  const goBack = () => { setDirection("back"); setStep(s => s - 1); };

  const handleNext = () => {
    const stepErrors = validateStep(step, formData);
    if (Object.keys(stepErrors).length > 0) { setErrors(stepErrors); return; }
    setErrors({});
    setDirection("fwd");
    setStep(s => s + 1);
  };

  const handlePublish = async () => {
    const allErrors = {
      ...validateStep(1, formData),
      ...validateStep(2, formData),
      ...validateStep(3, formData),
    };

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      if      (Object.keys(validateStep(1, formData)).length > 0) setStep(1);
      else if (Object.keys(validateStep(2, formData)).length > 0) setStep(2);
      else setStep(3);
      return;
    }

    setPublishing(true);
    try {
      if (formData.pnrNumber) {
        const soldSnap = await getDoc(doc(db, "soldPnrs", formData.pnrNumber));
        if (soldSnap.exists()) {
          alert("This ticket has already been sold. Please start over.");
          setPublishing(false); navigate("/create-listing"); return;
        }
        const dupSnap = await getDocs(
          query(collection(db, "tickets"), where("pnrNumber", "==", formData.pnrNumber))
        );
        if (!dupSnap.empty) {
          alert("This PNR has already been listed. Please start over.");
          setPublishing(false); navigate("/create-listing"); return;
        }
      }

      await addDoc(collection(db, "tickets"), {
        ...formData,
        uid         : user?.sub     || null,
        listerPhoto : user?.picture || null,
        createdAt   : serverTimestamp(),
        status      : "active",
        sold        : false,
      });
      navigate("/browse");
    } catch (err) {
      console.error("Publish failed:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  const progressPct = step === 0 ? 0 : (step / 4) * 100;

  return (
    <>
      <ThemeStyles />
      <div
        className="min-h-screen flex justify-center px-3 sm:px-4 md:px-6
                   pb-10 sm:pb-14 bg-[var(--color-bg)] text-[var(--color-text)]"
        style={{ paddingTop: "calc(var(--navbar-height, 64px) + 1.25rem)" }}
      >
        <div className="w-full max-w-5xl">

          {/* Heading */}
          <KineticText
            text="List Your Ticket"
            className="text-[2.41rem]  sm:text-[3.75rem] md:text-[4.5rem] lg:text-[6.25rem]
                       leading-tight tracking-[-2%] sm:tracking-[-3%] [font-optical-sizing:auto]
                       flex items-center justify-center text-center
                       mt-2 sm:mt-4 mb-5 sm:mb-8 md:mb-9"
          />

          {/* Custom orange progress bar */}
          {step > 0 && (
            <div className="max-w-2xl mx-auto mb-6 sm:mb-9 px-1 sm:px-0">
              <div className="flex items-center justify-between mb-2">
                {STEP_LABELS.slice(1).map((label, i) => {
                  const stepNum = i + 1;
                  const active  = stepNum <= step;
                  return (
                    <span
                      key={label}
                      className="text-[9px] xs:text-[10px] sm:text-xs font-mono font-semibold transition-colors text-center flex-1"
                      style={{ color: active ? "var(--rail-orange)" : "var(--color-text-subtle)" }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
              <div className="rail-progress-track h-1 rounded-full overflow-hidden">
                <div className="rail-progress-fill h-full rounded-full" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          {/* Two-column layout: form + persistent ticket stub */}
          <div className="flex flex-col lg:flex-row gap-5 sm:gap-8 max-w-5xl mx-auto items-start">

            {/* Form column */}
            <div className="w-full lg:flex-1 lg:max-w-2xl min-w-0">
              <div
                key={step}
                className={direction === "fwd" ? "rail-step-fwd" : "rail-step-back"}
              >
                {step === 0 && <PNRStep onVerified={handlePNRVerified} />}
                {step === 1 && <Step1  formData={formData} handleChange={handleChange} errors={errors} />}
                {step === 2 && <Step2  formData={formData} handleChange={handleChange} errors={errors} />}
                {step === 3 && <Step3  formData={formData} handleChange={handleChange} errors={errors} />}
                {step === 4 && <Step4  formData={formData} />}
              </div>

              {step > 0 && (
                <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-3 mt-6 sm:mt-9">
                  {/* Back */}
                  <button
                    onClick={goBack}
                    disabled={step === 1}
                    className="rail-focus order-2 xs:order-1 flex items-center justify-center gap-1
                               border border-[var(--color-border)] text-[var(--color-text)]
                               text-sm font-medium px-4 py-2.5 rounded-lg
                               hover:bg-[var(--color-surface-hover)] disabled:opacity-40 transition"
                  >
                    <ChevronLeft size={16} />
                    Back
                  </button>

                  {/* Right side */}
                  <div className="order-1 xs:order-2 flex items-center gap-2 sm:gap-3">

                    {step < 4 ? (
                      <button
                        onClick={handleNext}
                        className="rail-btn-primary w-full xs:w-auto flex items-center justify-center gap-1 text-sm font-medium
                                   px-4 sm:px-5 py-2.5 rounded-lg transition"
                      >
                        Next
                        <ChevronRight size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={handlePublish}
                        disabled={publishing}
                        className="rail-btn-primary w-full xs:w-auto flex items-center justify-center gap-2 text-sm font-medium
                                   px-4 sm:px-5 py-2.5 rounded-lg
                                   disabled:opacity-60 transition"
                      >
                        {publishing ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10"
                                      stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8z"/>
                            </svg>
                            Publishing…
                          </>
                        ) : "Publish Listing"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Ticket stub column — persistent live preview */}
            <div className="w-full lg:w-[340px] lg:flex-shrink-0 lg:sticky lg:top-6">
              <TicketStub formData={formData} step={step} />
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default CreateListingPage;