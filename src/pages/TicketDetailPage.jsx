import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { db } from "../firebase";
import { doc, collection, addDoc, onSnapshot, serverTimestamp, query, where } from "firebase/firestore";
import {
  
  Train, Calendar, Clock, MapPin, Users,
  MessageCircle, Share2, Info, ChevronRight, CheckCircle, Bell, BadgeCheck,
} from "lucide-react";

// ── Shared theme tokens (same system as CreateListingPage / MyListingPage) ─
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
    .rail-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
    }
    @keyframes skeleton-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .skeleton-pulse {
      animation: skeleton-pulse 1.5s ease-in-out infinite;
    }
  `}</style>
);

// ── Detail page skeleton (mirrors the two-column layout below) ─────────────
const TicketDetailSkeleton = () => (
  <div
    className="min-h-screen bg-[var(--color-bg)] pb-12 px-4 sm:px-6"
    style={{ paddingTop: "calc(var(--navbar-height, 64px) + 1.25rem)" }}
  >
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-6">
        <div className="h-3 w-10 rounded bg-[var(--color-surface-hover)] skeleton-pulse" />
        <ChevronRight size={14} className="text-[var(--color-border)]" />
        <div className="h-3 w-24 rounded bg-[var(--color-surface-hover)] skeleton-pulse" />
        <ChevronRight size={14} className="text-[var(--color-border)]" />
        <div className="h-3 w-32 rounded bg-[var(--color-surface-hover)] skeleton-pulse" />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Left column ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          <div className="rail-card rounded-2xl p-5 md:p-6 skeleton-pulse">
            {/* Header */}
            <div className="flex items-start justify-between mb-5 gap-3">
              <div className="min-w-0 flex-1">
                <div className="h-6 w-48 rounded bg-[var(--color-surface-hover)] mb-2" />
                <div className="h-3 w-20 rounded bg-[var(--color-surface-hover)]" />
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="h-5 w-16 rounded-full bg-[var(--color-surface-hover)]" />
                <div className="h-5 w-14 rounded-full bg-[var(--color-surface-hover)]" />
              </div>
            </div>

            {/* Time box */}
            <div className="border border-[var(--color-border)] bg-[var(--color-surface-hover)] rounded-xl p-4 md:p-5 mb-5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-center flex-1">
                  <div className="h-7 w-16 rounded bg-[var(--color-border)] mx-auto mb-2" />
                  <div className="h-3 w-14 rounded bg-[var(--color-border)] mx-auto mb-1" />
                  <div className="h-2.5 w-12 rounded bg-[var(--color-border)] mx-auto" />
                </div>
                <div className="flex-1 flex flex-col items-center gap-1 px-2">
                  <div className="h-2.5 w-10 rounded bg-[var(--color-border)] mb-1" />
                  <div className="h-px w-full bg-[var(--color-border)]" />
                </div>
                <div className="text-center flex-1">
                  <div className="h-7 w-16 rounded bg-[var(--color-border)] mx-auto mb-2" />
                  <div className="h-3 w-14 rounded bg-[var(--color-border)] mx-auto mb-1" />
                  <div className="h-2.5 w-12 rounded bg-[var(--color-border)] mx-auto" />
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <div className="h-2.5 w-20 rounded bg-[var(--color-surface-hover)] mb-2" />
                  <div className="h-3.5 w-16 rounded bg-[var(--color-surface-hover)]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="rail-card rounded-2xl p-5 skeleton-pulse">
            <div className="h-2.5 w-20 rounded bg-[var(--color-surface-hover)] mb-2" />
            <div className="h-7 w-24 rounded bg-[var(--color-surface-hover)] mb-2" />
            <div className="h-2.5 w-32 rounded bg-[var(--color-surface-hover)] mb-5" />

            <div className="border-t border-[var(--color-border)] mb-4" />

            <div className="h-2.5 w-16 rounded bg-[var(--color-surface-hover)] mb-2" />
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-full bg-[var(--color-surface-hover)] flex-shrink-0" />
              <div className="h-3.5 w-24 rounded bg-[var(--color-surface-hover)]" />
            </div>

            <div className="h-11 w-full rounded-xl bg-[var(--color-surface-hover)] mb-3" />
            <div className="h-9 w-full rounded-xl bg-[var(--color-surface-hover)]" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const TicketDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loginWithRedirect, user } = useAuth0();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);

  useEffect(() => {
  const unsubscribe = onSnapshot(
    doc(db, "tickets", id),
    (snap) => {
      if (!snap.exists()) {
        setNotFound(true);
        setTicket(null);
      } else {
        setNotFound(false);
        setTicket({
          id: snap.id,
          ...snap.data(),
        });
      }

      setLoading(false);
    },
    (err) => {
      console.error("Error fetching ticket:", err);
      setNotFound(true);
      setLoading(false);
    }
  );

  return () => unsubscribe();
}, [id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.email || !id) {
      setAlreadyRequested(false);
      return;
    }
    const q = query(
      collection(db, "contactRequests"),
      where("ticketId", "==", id),
      where("buyerEmail", "==", user.email.toLowerCase())
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setAlreadyRequested(!snap.empty);
      },
      (err) => {
        console.error("Error checking existing request:", err);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, user, id]);

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

  const handleContact = async () => {
    if (!isAuthenticated) {
      loginWithRedirect();
      return;
    }
    if (alreadyRequested || requestSent) return;
    setRequesting(true);
    try {
      await addDoc(collection(db, "contactRequests"), {
        ticketId: ticket.id,
        ticketName: ticket.trainName,
        trainNumber: ticket.trainNumber,
        from: ticket.from,
        to: ticket.to,
        journeyDate: ticket.journeyDate,
        price: ticket.price,
        buyerName: user.name || user.email,
        buyerEmail: user.email.toLowerCase(),
        buyerPhoto: user.picture || null,
        buyerUid: user.sub,
        sellerEmail: ticket.email?.toLowerCase(),
        sellerUid: ticket.uid || null,
        status: "pending",
        sellerPhone: ticket.phone || null,
        sellerName: ticket.fullName || null,
        sellerPhoto: ticket.listerPhoto || null,
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, "notifications"), {
  type: "new_request",
  sellerEmail: ticket.email?.toLowerCase(),
  buyerName: user.name || user.email,
  buyerEmail: user.email.toLowerCase(),
  ticketId: ticket.id,
  ticketName: ticket.trainName,
  from: ticket.from,
  to: ticket.to,
  journeyDate: ticket.journeyDate,
  createdAt: serverTimestamp(),
});
      setRequestSent(true);
    } catch (err) {
      console.error("Failed to send request:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setRequesting(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket: ${ticket.trainName}`,
          text: `${ticket.from} → ${ticket.to} on ${ticket.journeyDate} for ₹${ticket.price}/seat`,
          url,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading)
    return (
      <>
        <ThemeStyles />
        <TicketDetailSkeleton />
      </>
    );

  if (notFound)
    return (
      <>
        <ThemeStyles />
        <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-bg)]">
          <div className="text-center">
            <Train size={40} className="mx-auto mb-4 text-[var(--color-text-subtle)] opacity-40" />
            <h1 className="text-xl font-bold text-[var(--color-text)] mb-2 font-mono">Ticket not found</h1>
            <p className="text-sm text-[var(--color-text-subtle)] mb-5">This listing may have been removed.</p>
            <button
              onClick={() => navigate("/browse")}
              className="rail-btn-primary text-sm font-medium px-5 py-2.5 rounded-lg transition"
            >
              Back to Browse
            </button>
          </div>
        </div>
      </>
    );

  const duration = getDuration(ticket.departureTime, ticket.arrivalTime);
  const isSold = !!ticket.sold;
  const isSentOrRequested = requestSent || alreadyRequested;

  return (
    <>
      <ThemeStyles />
      <div
        className="min-h-screen bg-[var(--color-bg)] pb-12 px-4 sm:px-6"
        style={{ paddingTop: "calc(var(--navbar-height, 64px) + 1.25rem)" }}
      >
        <div className="max-w-5xl mx-auto">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-subtle)] mb-6 flex-wrap font-mono">
            <Link to="/" className="hover:text-[var(--rail-orange)] transition">Home</Link>
            <ChevronRight size={14} />
            <Link to="/browse" className="hover:text-[var(--rail-orange)] transition">Browse Tickets</Link>
            <ChevronRight size={14} />
            <span className="text-[var(--color-text)] font-medium truncate max-w-[200px]">{ticket.trainName}</span>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── Left column ── */}
            <div className="flex-1 min-w-0 flex flex-col gap-5">

              {/* Sold banner — shown at the top of the left column (UNCHANGED) */}
              {isSold && (
                <div className="flex items-start gap-3 bg-yellow-50 border-2 border-yellow-300 rounded-2xl px-4 py-4">
                  <BadgeCheck size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-800">This ticket has been sold</p>
                    <p className="text-xs text-yellow-600 mt-0.5 leading-relaxed">
                      The seller has marked this listing as sold. It is no longer available for purchase.
                    </p>
                  </div>
                </div>
              )}

              {/* Main ticket card */}
              <div className={`border rounded-2xl p-5 md:p-6 ${
                isSold
                  ? "bg-yellow-50 border-2 border-yellow-300"
                  : "rail-card rounded-2xl"
              }`}>

                {/* Header */}
                <div className="flex items-start justify-between mb-5 gap-3">
                  <div className="min-w-0">
                    <h1 className={`text-xl md:text-2xl font-bold truncate ${
                      isSold ? "text-yellow-900" : "text-[var(--color-text)]"
                    }`}>
                      {ticket.trainName || "—"}
                    </h1>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-[var(--color-text-subtle)] font-mono">
                      <Train size={13} />
                      <span>{ticket.trainNumber || "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-xs border px-2.5 py-1 rounded-full ${
                      isSold
                        ? "border-yellow-300 text-yellow-700 bg-yellow-100"
                        : "border-[var(--color-border)] text-[var(--color-text-subtle)]"
                    }`}>
                      {ticket.trainClass}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      isSold
                        ? "bg-yellow-400 text-yellow-900"
                        : "rail-btn-primary"
                    }`}>
                      {isSold ? "Sold" : (ticket.status || "Active")}
                    </span>
                  </div>
                </div>

                {/* Time box */}
                <div className={`border rounded-xl p-4 md:p-5 mb-5 ${
                  isSold
                    ? "bg-yellow-100 border-yellow-200"
                    : "bg-[var(--color-surface-hover)] border-[var(--color-border)]"
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-center">
                      <p className={`text-2xl md:text-3xl font-bold font-mono ${
                        isSold ? "text-yellow-800" : "text-[var(--color-text)]"
                      }`}>
                        {ticket.departureTime || "—"}
                      </p>
                      <p className={`text-sm font-medium mt-1 ${
                        isSold ? "text-yellow-700" : "text-[var(--color-text)]"
                      }`}>{ticket.from || "—"}</p>
                      <p className="text-xs text-[var(--color-text-subtle)]">Departure</p>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1 px-2">
                      {duration && (
                        <span className="text-xs text-[var(--color-text-subtle)] font-medium font-mono">{duration}</span>
                      )}
                      <div className="flex items-center w-full gap-1">
                        <div className={`flex-1 h-px ${isSold ? "bg-yellow-300" : "bg-[var(--color-border)]"}`} />
                        <Train size={16} className={isSold ? "text-yellow-400 flex-shrink-0" : "flex-shrink-0"} style={!isSold ? { color: "var(--rail-orange)" } : undefined} />
                        <div className={`flex-1 h-px ${isSold ? "bg-yellow-300" : "bg-[var(--color-border)]"}`} />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className={`text-2xl md:text-3xl font-bold font-mono ${
                        isSold ? "text-yellow-800" : "text-[var(--color-text)]"
                      }`}>
                        {ticket.arrivalTime || "—"}
                      </p>
                      <p className={`text-sm font-medium mt-1 ${
                        isSold ? "text-yellow-700" : "text-[var(--color-text)]"
                      }`}>{ticket.to || "—"}</p>
                      <p className="text-xs text-[var(--color-text-subtle)]">Arrival</p>
                    </div>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-5">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)] mb-1">
                      <Calendar size={12} /> Journey Date
                    </div>
                    <p className={`text-sm font-semibold ${isSold ? "text-yellow-800" : "text-[var(--color-text)]"}`}>
                      {ticket.journeyDate || "—"}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)] mb-1">
                      <Clock size={12} /> Duration
                    </div>
                    <p className={`text-sm font-semibold ${isSold ? "text-yellow-800" : "text-[var(--color-text)]"}`}>
                      {duration || "—"}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)] mb-1">
                      <Users size={12} /> Seats Available
                    </div>
                    <p className={`text-sm font-semibold ${isSold ? "text-yellow-800" : "text-[var(--color-text)]"}`}>
                      {ticket.seats}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)] mb-1">
                      <MapPin size={12} /> From
                    </div>
                    <p className={`text-sm font-semibold ${isSold ? "text-yellow-800" : "text-[var(--color-text)]"}`}>
                      {ticket.from || "—"}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)] mb-1">
                      <MapPin size={12} /> To
                    </div>
                    <p className={`text-sm font-semibold ${isSold ? "text-yellow-800" : "text-[var(--color-text)]"}`}>
                      {ticket.to || "—"}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)] mb-1">
                      <Train size={12} /> Class
                    </div>
                    <p className={`text-sm font-semibold ${isSold ? "text-yellow-800" : "text-[var(--color-text)]"}`}>
                      {ticket.trainClass || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              {ticket.description && (
                <div className="rail-card rounded-2xl p-5 md:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Info size={16} style={{ color: "var(--rail-orange)" }} />
                    <h2 className="text-sm font-bold text-[var(--color-text)]">Additional Information</h2>
                  </div>
                  <p className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wide mb-1.5 font-mono">
                    Description
                  </p>
                  <p className="text-sm text-[var(--color-text-subtle)] leading-relaxed">{ticket.description}</p>
                </div>
              )}
            </div>

            {/* ── Right column ── */}
            <div className="w-full lg:w-72 flex-shrink-0">
              <div className="lg:sticky flex flex-col gap-4" style={{ top: "calc(var(--navbar-height, 64px) + 1.5rem)" }}>
                <div className={`border rounded-2xl p-5 ${
                  isSold
                    ? "bg-yellow-50 border-2 border-yellow-300"
                    : "rail-card rounded-2xl"
                }`}>

                  <p className="text-xs text-[var(--color-text-subtle)] mb-1">Price per seat</p>
                  <p className={`text-3xl font-bold mb-1 font-mono ${isSold ? "text-yellow-800" : "text-[var(--color-text)]"}`}>
                    ₹{ticket.price}
                  </p>
                  <p className="text-xs text-[var(--color-text-subtle)] mb-5">
                    Total for {ticket.seats}: ₹{Number(ticket.price) * parseInt(ticket.seats)}
                  </p>

                  <div className={`border-t mb-4 ${isSold ? "border-yellow-200" : "border-[var(--color-border)]"}`} />

                  <p className="text-xs text-[var(--color-text-subtle)] mb-2">Listed by</p>
                  <div className="flex items-center gap-2.5 mb-5">
    {ticket.listerPhoto ? (
    <img
      src={ticket.listerPhoto}
      alt={ticket.fullName}
      className="w-9 h-9 rounded-full object-cover border border-[var(--color-border)] flex-shrink-0"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{ background: "var(--rail-orange-dim)", color: "var(--rail-orange)" }}
    >
      {getInitials(ticket.fullName)}
    </div>
  )}
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text)]">{ticket.fullName || "—"}</p>
                    </div>
                  </div>

                  {/* CTA area — sold state takes priority over request state (UNCHANGED) */}
                  {isSold ? (
                    <div className="flex flex-col gap-3">
                      <div className="w-full flex items-center justify-center gap-2 bg-yellow-100 border-2 border-yellow-300 text-yellow-800 text-sm font-semibold py-3 rounded-xl">
                        <BadgeCheck size={16} />
                        Ticket Sold
                      </div>
                      <p className="text-[11px] text-[var(--color-text-subtle)] text-center leading-relaxed">
                        This ticket is no longer available. Browse other listings to find a similar route.
                      </p>
                      <button
                        onClick={() => navigate("/browse")}
                        className="rail-focus w-full flex items-center justify-center gap-1.5 border border-[var(--color-border)] text-[var(--color-text)] text-xs font-medium py-2.5 rounded-xl hover:bg-[var(--color-surface-hover)] transition"
                      >
                        Browse other tickets
                      </button>
                    </div>
                  ) : isSentOrRequested ? (
                    <div className="flex flex-col gap-3">
                      <div className="w-full flex items-center justify-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold py-3 rounded-xl">
                        <CheckCircle size={16} />
                        Request Sent
                      </div>
                      <p className="text-[11px] text-[var(--color-text-subtle)] text-center leading-relaxed">
                        The seller will review your request. You'll be able to see their contact details once approved.
                      </p>
                      <Link
                        to="/my-requests"
                        className="rail-focus w-full flex items-center justify-center gap-1.5 border border-[var(--color-border)] text-[var(--color-text)] text-xs font-medium py-2.5 rounded-xl hover:bg-[var(--color-surface-hover)] transition"
                      >
                        <Bell size={14} />
                        View my requests
                      </Link>
                    </div>
                  ) : (
                    <button
                      onClick={handleContact}
                      disabled={requesting}
                      className="rail-btn-primary w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-xl disabled:opacity-60 transition mb-3"
                    >
                      {requesting ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      ) : (
                        <MessageCircle size={16} />
                      )}
                      {requesting ? "Sending..." : "Request Seller"}
                    </button>
                  )}

                  {/* Share */}
                  <button
                    onClick={handleShare}
                    className="rail-focus w-full flex items-center justify-center gap-1.5 border border-[var(--color-border)] text-[var(--color-text)] text-xs font-medium py-2.5 rounded-xl hover:bg-[var(--color-surface-hover)] transition mt-3"
                  >
                    <Share2 size={14} />
                    {copied ? "Link Copied!" : "Share"}
                  </button>

                  {!isAuthenticated && !isSold && (
                    <p className="text-[11px] text-[var(--color-text-subtle)] text-center mt-3 leading-relaxed">
                      You'll be redirected to login before contacting the seller.
                    </p>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default TicketDetailPage;