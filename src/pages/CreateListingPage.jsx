import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import ProgressBar from "../components/ProgressBar";
import { ChevronLeft, ChevronRight, Save, Train, Ticket, User, ChevronDown, Check } from "lucide-react";
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
      className={`w-full border rounded-lg px-3 md:px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10
        ${error ? "border-red-400" : "border-gray-200"}
        ${props.readOnly ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
      {...props}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    {hint && <p className="text-gray-400 text-xs mt-1">{hint}</p>}
  </div>
);

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
          border rounded-lg px-3 md:px-4 py-2.5 text-sm text-left
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
                <span className={value === opt ? "font-semibold text-gray-900" : "text-gray-600"}>
                  {opt}
                </span>
                {value === opt && <Check size={13} className="text-gray-900 flex-shrink-0" />}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};

const classOptions = ["Economy", "Sleeper", "AC 3-Tier", "AC 2-Tier", "First AC"];
const seatOptions = ["1 seat", "2 seats", "3 seats", "4 seats"];

// ── validateStep ───────────────────────────────────────────────────────────
const validateStep = (step, formData) => {
  const errors = {};

  if (step === 1) {
    if (!formData.from.trim())
      errors.from = "Starting city is required";
    else if (!/^[a-zA-Z\s]+$/.test(formData.from.trim()))
      errors.from = "City name should contain only letters";

    if (!formData.to.trim())
      errors.to = "Destination city is required";
    else if (!/^[a-zA-Z\s]+$/.test(formData.to.trim()))
      errors.to = "City name should contain only letters";

    if (
      formData.from.trim() &&
      formData.to.trim() &&
      formData.from.trim().toLowerCase() === formData.to.trim().toLowerCase()
    )
      errors.to = "Destination must be different from starting city";

    if (!formData.trainName.trim())
      errors.trainName = "Train name is required";
    else if (!/^[a-zA-Z\s]+$/.test(formData.trainName.trim()))
      errors.trainName = "Train name should contain only letters";

    if (!formData.trainNumber.trim())
      errors.trainNumber = "Train number is required";
    else if (!/^\d+$/.test(formData.trainNumber.trim()))
      errors.trainNumber = "Train number should contain only digits";

    if (!formData.journeyDate)
      errors.journeyDate = "Journey date is required";
    else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(formData.journeyDate);
      if (selectedDate < today)
        errors.journeyDate = "Journey date cannot be in the past";
    }

    if (!formData.departureTime)
      errors.departureTime = "Departure time is required";

    if (!formData.arrivalTime)
      errors.arrivalTime = "Arrival time is required";
  }

  if (step === 2) {
    if (!formData.price)
      errors.price = "Price is required";
    else if (!/^\d+$/.test(formData.price.toString().trim()))
      errors.price = "Price should be a whole number";
    else if (Number(formData.price) <= 0)
      errors.price = "Price must be greater than 0";
    else if (Number(formData.price) > 50000)
      errors.price = "Price seems too high, please check";
  }

  if (step === 3) {
    if (!formData.fullName.trim())
      errors.fullName = "Full name is required";
    else if (!/^[a-zA-Z\s]+$/.test(formData.fullName.trim()))
      errors.fullName = "Name should contain only letters";
    else if (formData.fullName.trim().length < 3)
      errors.fullName = "Name must be at least 3 characters";

    if (!formData.email.trim())
      errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      errors.email = "Enter a valid email";

    if (!formData.phone.trim())
      errors.phone = "Phone number is required";
    else if (!/^\d{10}$/.test(formData.phone.trim()))
      errors.phone = "Phone number must be exactly 10 digits";
  }

  return errors;
};

// ── Step panels ────────────────────────────────────────────────────────────
const Step1 = ({ formData, handleChange, errors }) => (
  <div className="border border-gray-200 rounded-xl p-4 md:p-6">
    <h2 className="text-base md:text-lg font-bold text-gray-900">Journey Details</h2>
    <p className="text-xs md:text-sm text-gray-500 mt-1 mb-4 md:mb-6">
      Enter your train journey information.
    </p>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
      <div>
        <Label required>From</Label>
        <Input
          placeholder="e.g. Mumbai"
          value={formData.from}
          onChange={handleChange("from")}
          error={errors.from}
        />
      </div>
      <div>
        <Label required>To</Label>
        <Input
          placeholder="e.g. Delhi"
          value={formData.to}
          onChange={handleChange("to")}
          error={errors.to}
        />
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
      <div>
        <Label required>Train Name</Label>
        <Input
          placeholder="e.g. Rajdhani Express"
          value={formData.trainName}
          onChange={handleChange("trainName")}
          error={errors.trainName}
        />
      </div>
      <div>
        <Label required>Train Number</Label>
        <Input
          placeholder="e.g. 12951"
          value={formData.trainNumber}
          onChange={handleChange("trainNumber")}
          error={errors.trainNumber}
        />
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
      <div>
        <Label required>Journey Date</Label>
        <Input
          type="date"
          value={formData.journeyDate}
          onChange={handleChange("journeyDate")}
          error={errors.journeyDate}
        />
      </div>
      <div></div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
      <div>
        <Label required>Departure Time</Label>
        <Input
          type="time"
          value={formData.departureTime}
          onChange={handleChange("departureTime")}
          error={errors.departureTime}
        />
      </div>
      <div>
        <Label required>Arrival Time</Label>
        <Input
          type="time"
          value={formData.arrivalTime}
          onChange={handleChange("arrivalTime")}
          error={errors.arrivalTime}
        />
      </div>
    </div>
  </div>
);

const Step2 = ({ formData, handleChange, errors }) => (
  <div className="border border-gray-200 rounded-xl p-4 md:p-6">
    <h2 className="text-base md:text-lg font-bold text-gray-900">Ticket Details</h2>
    <p className="text-xs md:text-sm text-gray-500 mt-1 mb-4 md:mb-6">
      Specify the class, number of seats, and your asking price.
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-5">
      <div>
        <Label required>Train Class</Label>
        <CustomSelect
          value={formData.trainClass}
          onChange={(val) => handleChange("trainClass")({ target: { value: val } })}
          options={classOptions}
        />
      </div>
      <div>
        <Label required>Number of Seats</Label>
        <CustomSelect
          value={formData.seats}
          onChange={(val) => handleChange("seats")({ target: { value: val } })}
          options={seatOptions}
        />
      </div>
    </div>
    <div className="mb-4 md:mb-5">
      <Label required>Price per Seat (₹)</Label>
      <Input
        placeholder="e.g. 450"
        type="number"
        value={formData.price}
        onChange={handleChange("price")}
        error={errors.price}
        hint={!errors.price ? "Set a fair price. The original ticket price can be found on your ticket." : undefined}
      />
    </div>
    <div>
      <Label>Description</Label>
      <textarea
        placeholder="Any additional info buyers should know..."
        rows={3}
        value={formData.description}
        onChange={handleChange("description")}
        className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 md:px-4 py-2.5 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-black/10"
      />
    </div>
  </div>
);

const Step3 = ({ formData, handleChange, errors }) => (
  <div className="border border-gray-200 rounded-xl p-4 md:p-6">
    <h2 className="text-base md:text-lg font-bold text-gray-900">Contact Info</h2>
    <p className="text-xs md:text-sm text-gray-500 mt-1 mb-4 md:mb-6">
      How should buyers reach you?
    </p>
    <div className="mb-3 md:mb-4">
      <Label required>Full Name</Label>
      <Input
        placeholder="e.g. Rahul Sharma"
        value={formData.fullName}
        onChange={handleChange("fullName")}
        error={errors.fullName}
      />
    </div>
    <div className="mb-3 md:mb-4">
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

// ── Step4: Review & Publish ────────────────────────────────────────────────
const ReviewRow = ({ label, value, muted = false }) => (
  <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-100 last:border-b-0">
    <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
    <span className={`text-sm text-right break-words ${muted ? "text-gray-900" : "font-semibold text-gray-900"}`}>
      {value}
    </span>
  </div>
);

const Step4 = ({ formData }) => (
  <div className="border border-gray-200 rounded-xl p-4 md:p-6">
    <h2 className="text-base md:text-lg font-bold text-gray-900">Review Your Listing</h2>
    <p className="text-xs md:text-sm text-gray-500 mt-1 mb-4 md:mb-6">
      Confirm all details before publishing.
    </p>

    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Train size={16} className="text-gray-700 flex-shrink-0" />
        <h3 className="text-sm font-bold text-gray-900">Journey Details</h3>
      </div>
      <div className="border border-gray-200 rounded-lg px-3 sm:px-4">
        <ReviewRow
          label="Train"
          value={
            formData.trainName || formData.trainNumber
              ? `${formData.trainName || "—"}${formData.trainNumber ? ` (${formData.trainNumber})` : ""}`
              : "—"
          }
        />
        <ReviewRow label="Route" value={`${formData.from || "—"} → ${formData.to || "—"}`} />
        <ReviewRow label="Date" value={formData.journeyDate || "—"} />
        <ReviewRow label="Timing" value={`${formData.departureTime || "—"} → ${formData.arrivalTime || "—"}`} />
      </div>
    </div>

    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Ticket size={16} className="text-gray-700 flex-shrink-0" />
        <h3 className="text-sm font-bold text-gray-900">Ticket Details</h3>
      </div>
      <div className="border border-gray-200 rounded-lg px-3 sm:px-4">
        <ReviewRow label="Class" value={formData.trainClass || "—"} />
        <ReviewRow label="Seats" value={formData.seats || "—"} />
        <ReviewRow label="Price" value={formData.price ? `₹${formData.price} / seat` : "—"} />
      </div>
      {formData.description && (
        <p className="text-sm text-gray-600 mt-2">{formData.description}</p>
      )}
    </div>

    <div>
      <div className="flex items-center gap-2 mb-2">
        <User size={16} className="text-gray-700 flex-shrink-0" />
        <h3 className="text-sm font-bold text-gray-900">Contact Info</h3>
      </div>
      <div className="border border-gray-200 rounded-lg px-3 sm:px-4">
        <ReviewRow label="Name" value={formData.fullName || "—"} />
        <ReviewRow label="Email" value={formData.email || "—"} />
        <ReviewRow label="Phone" value={formData.phone || "Not provided"} muted={!formData.phone} />
      </div>
    </div>
  </div>
);

// ── Page ───────────────────────────────────────────────────────────────────
const CreateListingPage = () => {
  const { user } = useAuth0();
  const [step, setStep] = useState(1);
  const [publishing, setPublishing] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    from: "", to: "", trainName: "", trainNumber: "", journeyDate: "",
    departureTime: "", arrivalTime: "",
    trainClass: "Economy", seats: "1 seat",
    price: "", description: "",
    fullName: "", email: "", phone: "",
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        email: user.email ? user.email.toLowerCase() : prev.email,
      }));
    }
  }, [user]);

  const handleChange = useCallback((field) => (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const handleNext = () => {
    const stepErrors = validateStep(step, formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
  };

  const handlePublish = async () => {
    const step1Errors = validateStep(1, formData);
    const step2Errors = validateStep(2, formData);
    const step3Errors = validateStep(3, formData);
    const allErrors = { ...step1Errors, ...step2Errors, ...step3Errors };

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      if (Object.keys(step1Errors).length > 0) setStep(1);
      else if (Object.keys(step2Errors).length > 0) setStep(2);
      else setStep(3);
      return;
    }

    setPublishing(true);
    try {
      await addDoc(collection(db, "tickets"), {
        ...formData,
        uid: user?.sub || null,
        createdAt: serverTimestamp(),
        status: "active",
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
    <div className="min-h-screen flex justify-center px-4 py-6 md:py-10">
      <div className="w-full max-w-2xl mt-9">
        <div className="rounded-2xl px-4 flex flex-col gap-9 sm:px-6 md:px-8 pt-6 md:pt-8 pb-5 md:pb-6">

          <KineticText
            text="List Your Ticket"
            className="text-[2.65rem] sm:text-[3.25rem] md:text-[4.5rem] tracking-[-5%] flex items-center justify-center"
          />

          <ProgressBar step={step} />

          {step === 1 && <Step1 formData={formData} handleChange={handleChange} errors={errors} />}
          {step === 2 && <Step2 formData={formData} handleChange={handleChange} errors={errors} />}
          {step === 3 && <Step3 formData={formData} handleChange={handleChange} errors={errors} />}
          {step === 4 && <Step4 formData={formData} />}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1}
              className="flex items-center gap-1 border border-gray-300 text-gray-700 text-sm font-medium px-3 md:px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
            >
              <ChevronLeft size={16} />
              Back
            </button>

            <div className="flex items-center gap-2 md:gap-3">
              {step < 4 && (
                <button className="hidden sm:flex items-center gap-1.5 text-gray-500 text-sm font-medium hover:text-gray-700 transition">
                  <Save size={15} />
                  Save Draft
                </button>
              )}

              {step < 4 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 bg-black text-white text-sm font-medium px-4 md:px-5 py-2 rounded-lg hover:bg-gray-800 transition"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="flex items-center gap-2 bg-black text-white text-sm font-medium px-4 md:px-5 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-60 transition"
                >
                  {publishing ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Publishing...
                    </>
                  ) : "Publish Listing"}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CreateListingPage;