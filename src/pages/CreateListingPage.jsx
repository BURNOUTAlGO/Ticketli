import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import ProgressBar from "../components/ProgressBar";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { KineticText } from "@/components/ui/kinetic-text";

// ── Reusable components ────────────────────────────────────────────────────
const Label = ({ children, required }) => (
  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

const Select = ({ options, ...props }) => (
  <select
    className="w-full border border-gray-200 rounded-lg px-3 md:px-4 py-2.5 text-sm text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-black/10"
    {...props}
  >
    {options.map((o) => (
      <option key={o}>{o}</option>
    ))}
  </select>
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

// validateStep checks the current step of the form and returns any validation errors.
const validateStep = (step, formData) => {
  const errors = {};

  if (step === 1) {
    if (!formData.from.trim())          errors.from          = "Starting city is required";
    if (!formData.to.trim())            errors.to            = "Destination city is required";
    if (!formData.trainName.trim())     errors.trainName     = "Train name is required";
    if (!formData.journeyDate)          errors.journeyDate   = "Journey date is required";
    if (!formData.departureTime)        errors.departureTime = "Departure time is required";
    if (!formData.arrivalTime)          errors.arrivalTime   = "Arrival time is required";
  }

  if (step === 2) {
    if (!formData.price || Number(formData.price) <= 0)
      errors.price = "Valid price is required";
  }

  if (step === 3) {
    if (!formData.fullName.trim())  errors.fullName = "Full name is required";
    if (!formData.email.trim())     errors.email    = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
                                    errors.email    = "Enter a valid email";
    if (!formData.phone.trim())     errors.phone    = "Phone number is required";
    else if (!/^\d{10}$/.test(formData.phone.trim()))
                                    errors.phone    = "Enter a valid 10-digit phone number";
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
        <Label required>Journey Date</Label>
        <Input
          type="date"
          value={formData.journeyDate}
          onChange={handleChange("journeyDate")}
          error={errors.journeyDate}
        />
      </div>
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
        <div className="relative">
          <Select
            options={["Economy", "Sleeper", "AC 3-Tier", "AC 2-Tier", "First AC"]}
            value={formData.trainClass}
            onChange={handleChange("trainClass")}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▼</span>
        </div>
      </div>
      <div>
        <Label required>Number of Seats</Label>
        <div className="relative">
          <Select
            options={["1 seat", "2 seats", "3 seats", "4 seats"]}
            value={formData.seats}
            onChange={handleChange("seats")}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▼</span>
        </div>
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

const Step4 = ({ formData }) => (
  <div className="border border-gray-200 rounded-xl p-4 md:p-6">
    <h2 className="text-base md:text-lg font-bold text-gray-900">Review & Publish</h2>
    <p className="text-xs md:text-sm text-gray-500 mt-1 mb-4 md:mb-6">
      Review all details before publishing.
    </p>

    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Journey</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-gray-500">From</span><p className="font-medium text-gray-900">{formData.from || "—"}</p></div>
        <div><span className="text-gray-500">To</span><p className="font-medium text-gray-900">{formData.to || "—"}</p></div>
        <div><span className="text-gray-500">Train</span><p className="font-medium text-gray-900">{formData.trainName || "—"}</p></div>
        <div><span className="text-gray-500">Date</span><p className="font-medium text-gray-900">{formData.journeyDate || "—"}</p></div>
        <div><span className="text-gray-500">Departure</span><p className="font-medium text-gray-900">{formData.departureTime || "—"}</p></div>
        <div><span className="text-gray-500">Arrival</span><p className="font-medium text-gray-900">{formData.arrivalTime || "—"}</p></div>
      </div>
    </div>

    <div className="border-t border-gray-100 my-4" />

    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ticket</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-gray-500">Class</span><p className="font-medium text-gray-900">{formData.trainClass}</p></div>
        <div><span className="text-gray-500">Seats</span><p className="font-medium text-gray-900">{formData.seats}</p></div>
        <div><span className="text-gray-500">Price/seat</span><p className="font-medium text-gray-900">{formData.price ? `₹${formData.price}` : "—"}</p></div>
      </div>
      {formData.description && (
        <p className="text-sm text-gray-600 mt-2">{formData.description}</p>
      )}
    </div>

    <div className="border-t border-gray-100 my-4" />

    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Contact</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-gray-500">Name</span><p className="font-medium text-gray-900">{formData.fullName || "—"}</p></div>
       
        <div><span className="text-gray-500">Phone</span><p className="font-medium text-gray-900">{formData.phone || "—"}</p></div>
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
    from: "", to: "", trainName: "", journeyDate: "",
    departureTime: "", arrivalTime: "",
    trainClass: "Economy", seats: "1 seat",
    price: "", description: "",
    fullName: "", email: "", phone: "",
  });

  // Prefill email (and name if available) from the logged-in Auth0 user.
  // This ensures the saved ticket's email always matches user.email exactly,
  // which MyListingsPage relies on for its where("email", "==", ...) query.
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        email: user.email ? user.email.toLowerCase() : prev.email,
        
      }));
    }
  }, [user]);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

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
    const stepErrors = validateStep(3, formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setPublishing(true);
    try {
      await addDoc(collection(db, "tickets"), {
        ...formData,
        // store the Auth0 user id too, as a more reliable backup identifier
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

  const panels = [
    <Step1 formData={formData} handleChange={handleChange} errors={errors} />,
    <Step2 formData={formData} handleChange={handleChange} errors={errors} />,
    <Step3 formData={formData} handleChange={handleChange} errors={errors} />,
    <Step4 formData={formData} />,
  ];

  return (
    <div className="min-h-screen flex justify-center px-4 py-6 md:py-10">
      <div className="w-full max-w-2xl mt-9">
        <div className="rounded-2xl px-4 flex flex-col gap-9 sm:px-6 md:px-8 pt-6 md:pt-8 pb-5 md:pb-6">

          <KineticText
            text="List Your Ticket"
            className="text-[2.65rem] sm:text-[3.25rem] md:text-[4.5rem] tracking-[-5%] flex items-center justify-center "
          />

          <ProgressBar step={step} />

          {panels[step - 1]}

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