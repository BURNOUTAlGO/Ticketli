import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { db } from "../firebase";
import {
  collection, addDoc, serverTimestamp,
  query, where, getDocs, doc, getDoc,
} from "firebase/firestore";
import ProgressBar from "../components/ProgressBar";
import {
  ChevronLeft, ChevronRight, Save, Train, Ticket,
  User, ChevronDown, Check, Search, CheckCircle, AlertCircle,
} from "lucide-react";
import { KineticText } from "@/components/ui/kinetic-text";

// ── Reusable components ────────────────────────────────────────────────────
const Label = ({ children, required }) => (
  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

const Input = ({ error, hint, ...props }) => (
  <div>
    <input
      className={`
        w-full border rounded-lg px-3 py-2.5 text-sm bg-gray-50
        focus:outline-none focus:ring-2 focus:ring-black/10
        ${error ? "border-red-400" : "border-gray-200"}
        ${props.readOnly || props.disabled
          ? "bg-gray-100 text-gray-500 cursor-not-allowed"
          : ""}
      `}
      {...props}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    {hint  && <p className="text-gray-400 text-xs mt-1">{hint}</p>}
  </div>
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
          w-full flex items-center justify-between gap-2 border rounded-lg
          px-3 py-2.5 text-sm text-left transition-all
          focus:outline-none focus:ring-2 focus:ring-black/10
          ${disabled
            ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200"
            : `bg-gray-50 hover:bg-white hover:border-gray-300
               ${open ? "border-gray-400 bg-white" : "border-gray-200"}`
          }
        `}
      >
        <span className="text-gray-800 truncate">{value}</span>
        {!disabled && (
          <ChevronDown
            size={13}
            className={`text-gray-400 flex-shrink-0 transition-transform duration-150
              ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && !disabled && createPortal(
        <div
          ref={menuRef}
          style={menuStyle}
          className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden py-1"
        >
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2
                         text-sm text-left hover:bg-gray-50 transition"
            >
              <span className={value === opt
                ? "font-semibold text-gray-900"
                : "text-gray-600"}>
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

const classOptions = ["3E", "Sleeper", "AC 3-Tier", "AC 2-Tier", "First AC"];
const seatOptions  = ["1 seat", "2 seats", "3 seats", "4 seats"];

const mapClass = code => {
  const map = {
    SL: "Sleeper", "3A": "AC 3-Tier", "2A": "AC 2-Tier",
    "1A": "First AC", CC: "3E", EC: "3E", "2S": "3E", GN: "3E",
  };
  return map[code] || "3E";
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
    <div className="border border-gray-200 rounded-xl p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-bold text-gray-900">Verify Your Ticket</h2>
      <p className="text-xs sm:text-sm text-gray-500 mt-1 mb-4 sm:mb-6">
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
            flex-1 min-w-0 border rounded-lg px-3 py-2.5 text-sm bg-gray-50
            focus:outline-none focus:ring-2 focus:ring-black/10
            font-mono tracking-widest
            ${error ? "border-red-400" : "border-gray-200"}
          `}
        />
        <button
          onClick={verifyPNR}
          disabled={loading || pnr.length !== 10}
          className="flex items-center justify-center gap-1.5 bg-black text-white
                     text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-800
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
        <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-200
                        rounded-lg px-3 py-2.5 mb-4">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {pnrData && (
        <div className="border border-gray-200 rounded-xl p-4 mb-4 bg-gray-50">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-green-600" />
            <p className="text-sm font-semibold text-gray-900">PNR Verified Successfully</p>
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
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="font-semibold text-gray-900 text-xs break-words">{val}</p>
              </div>
            ))}
          </div>

          <button
            onClick={handleConfirm}
            className="w-full flex items-center justify-center gap-2 bg-black text-white
                       text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 transition"
          >
            <CheckCircle size={15} />
            Use This Ticket Details
          </button>
        </div>
      )}

      {!pnrData && !error && (
        <p className="text-xs text-gray-400 mt-2">
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
  <div className="border border-gray-200 rounded-xl p-4 sm:p-6">
    <h2 className="text-base sm:text-lg font-bold text-gray-900">Journey Details</h2>
    <p className="text-xs sm:text-sm text-gray-500 mt-1 mb-1 sm:mb-2">
      Journey details have been auto-filled from your PNR and are locked.
    </p>
    <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg
                    px-3 py-2 mb-4 sm:mb-5">
      <CheckCircle size={13} className="text-blue-600 flex-shrink-0" />
      <p className="text-xs text-blue-700">Fields below are auto-filled from PNR and cannot be edited.</p>
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
    <div className="border border-gray-200 rounded-xl p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-bold text-gray-900">Ticket Details</h2>
      <p className="text-xs sm:text-sm text-gray-500 mt-1 mb-4 sm:mb-6">
        Specify the number of seats and your asking price.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-5">
        <div>
          <Label required>Train Class</Label>
          <CustomSelect value={formData.trainClass} onChange={() => {}} options={classOptions} disabled />
          <p className="text-gray-400 text-xs mt-1">Auto-filled from PNR, cannot be changed.</p>
        </div>
        <div>
          <Label required>Number of Seats</Label>
          <CustomSelect value={formData.seats} onChange={() => {}} options={seatOptions} disabled />
          <p className="text-gray-400 text-xs mt-1">Auto-filled from PNR, cannot be changed.</p>
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
          className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5
                     text-sm text-gray-800 resize-none
                     focus:outline-none focus:ring-2 focus:ring-black/10"
        />
      </div>
    </div>
  );
};

// ── Step 3 ─────────────────────────────────────────────────────────────────
const Step3 = ({ formData, handleChange, errors }) => (
  <div className="border border-gray-200 rounded-xl p-4 sm:p-6">
    <h2 className="text-base sm:text-lg font-bold text-gray-900">Contact Info</h2>
    <p className="text-xs sm:text-sm text-gray-500 mt-1 mb-4 sm:mb-6">
      How should buyers reach you?
    </p>

    <div className="mb-3 sm:mb-4">
      <Label required>Full Name</Label>
      <Input
        placeholder="e.g. Rahul Sharma"
        value={formData.fullName}
        onChange={handleChange("fullName")}
        error={errors.fullName}
      />
    </div>

    <div className="mb-3 sm:mb-4">
      <Label required>Email</Label>
      <Input
        type="email"
        placeholder="e.g. rahul@email.com"
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
        placeholder="e.g. 9876543210"
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
                  border-b border-gray-100 last:border-b-0">
    <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
    <span className={`text-sm text-right break-all sm:break-words
      ${muted ? "text-gray-900" : "font-semibold text-gray-900"}`}>
      {value}
    </span>
  </div>
);

const Step4 = ({ formData }) => (
  <div className="border border-gray-200 rounded-xl p-4 sm:p-6">
    <h2 className="text-base sm:text-lg font-bold text-gray-900">Review Your Listing</h2>
    <p className="text-xs sm:text-sm text-gray-500 mt-1 mb-4 sm:mb-6">
      Confirm all details before publishing.
    </p>

    {formData.pnrNumber && (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200
                      rounded-lg px-3 py-2 mb-4 flex-wrap">
        <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
        <p className="text-xs text-green-700 font-medium">
          PNR Verified: <span className="font-mono">{formData.pnrNumber}</span>
        </p>
      </div>
    )}

    {/* Journey */}
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Train size={16} className="text-gray-700 flex-shrink-0" />
        <h3 className="text-sm font-bold text-gray-900">Journey Details</h3>
      </div>
      <div className="border border-gray-200 rounded-lg px-3 sm:px-4">
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
        <Ticket size={16} className="text-gray-700 flex-shrink-0" />
        <h3 className="text-sm font-bold text-gray-900">Ticket Details</h3>
      </div>
      <div className="border border-gray-200 rounded-lg px-3 sm:px-4">
        <ReviewRow label="Class" value={formData.trainClass || "—"} />
        <ReviewRow label="Seats" value={formData.seats      || "—"} />
        <ReviewRow label="Price" value={formData.price ? `₹${formData.price} / seat` : "—"} />
      </div>
      {formData.description && (
        <p className="text-sm text-gray-600 mt-2">{formData.description}</p>
      )}
    </div>

    {/* Contact */}
    <div>
      <div className="flex items-center gap-2 mb-2">
        <User size={16} className="text-gray-700 flex-shrink-0" />
        <h3 className="text-sm font-bold text-gray-900">Contact Info</h3>
      </div>
      <div className="border border-gray-200 rounded-lg px-3 sm:px-4">
        <ReviewRow label="Name"  value={formData.fullName || "—"} />
        <ReviewRow label="Phone" value={formData.phone    || "Not provided"} muted={!formData.phone} />
      </div>
    </div>
  </div>
);

// ── Page ───────────────────────────────────────────────────────────────────
const CreateListingPage = () => {
  const { user }                    = useAuth0();
  const [step,       setStep]       = useState(0);
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
    setStep(1);
  }, []);

  const handleChange = useCallback(field => e => {
    const value = e.target.value;
    setFormData(prev  => ({ ...prev,   [field]: value }));
    setErrors  (prev  => ({ ...prev,   [field]: undefined }));
  }, []);

  const handleNext = () => {
    const stepErrors = validateStep(step, formData);
    if (Object.keys(stepErrors).length > 0) { setErrors(stepErrors); return; }
    setErrors({});
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

  return (
    <div className="min-h-screen flex justify-center px-3 sm:px-4 py-6 sm:py-10">
      <div className="w-full max-w-2xl mt-6 sm:mt-9">
        <div className="rounded-2xl px-0 sm:px-4 md:px-8 pt-4 sm:pt-6 md:pt-8 pb-5 md:pb-6
                        flex flex-col gap-6 sm:gap-9">

          {/* Heading */}
          <KineticText
            text="List Your Ticket"
            className="text-[2.2rem] xs:text-[2.65rem] sm:text-[3.25rem] md:text-[4.5rem]
                       tracking-[-5%] flex items-center justify-center"
          />

          {step > 0 && <ProgressBar step={step} />}

          {step === 0 && <PNRStep onVerified={handlePNRVerified} />}
          {step === 1 && <Step1  formData={formData} handleChange={handleChange} errors={errors} />}
          {step === 2 && <Step2  formData={formData} handleChange={handleChange} errors={errors} />}
          {step === 3 && <Step3  formData={formData} handleChange={handleChange} errors={errors} />}
          {step === 4 && <Step4  formData={formData} />}

          {step > 0 && (
            <div className="flex items-center justify-between gap-2">
              {/* Back */}
              <button
                onClick={() => setStep(s => s - 1)}
                disabled={step === 1}
                className="flex items-center gap-1 border border-gray-300 text-gray-700
                           text-sm font-medium px-3 sm:px-4 py-2 rounded-lg
                           hover:bg-gray-50 disabled:opacity-40 transition"
              >
                <ChevronLeft size={16} />
                Back
              </button>

              {/* Right side */}
              <div className="flex items-center gap-2 sm:gap-3">
                {step < 4 && (
                  <button className="hidden sm:flex items-center gap-1.5 text-gray-500
                                     text-sm font-medium hover:text-gray-700 transition">
                    <Save size={15} />
                    Save Draft
                  </button>
                )}

                {step < 4 ? (
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1 bg-black text-white text-sm font-medium
                               px-4 sm:px-5 py-2 rounded-lg hover:bg-gray-800 transition"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="flex items-center gap-2 bg-black text-white text-sm font-medium
                               px-4 sm:px-5 py-2 rounded-lg hover:bg-gray-800
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
      </div>
    </div>
  );
};

export default CreateListingPage;