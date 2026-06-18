import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { db } from "../firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import {
  Train, Calendar, Clock, MapPin, Users,
  MessageCircle, Share2, Info, ChevronRight, CheckCircle, Bell, BadgeCheck,
} from "lucide-react";

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
    const fetchTicket = async () => {
      try {
        const snap = await getDoc(doc(db, "tickets", id));
        if (!snap.exists()) {
          setNotFound(true);
        } else {
          setTicket({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error("Error fetching ticket:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.email || !id) return;
    const checkExisting = async () => {
      const q = query(
        collection(db, "contactRequests"),
        where("ticketId", "==", id),
        where("buyerEmail", "==", user.email.toLowerCase())
      );
      const snap = await getDocs(q);
      if (!snap.empty) setAlreadyRequested(true);
    };
    checkExisting();
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
        buyerUid: user.sub,
        sellerEmail: ticket.email?.toLowerCase(),
        sellerUid: ticket.uid || null,
        status: "pending",
        sellerPhone: ticket.phone || null,
        sellerName: ticket.fullName || null,
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
      <div className="min-h-screen flex items-center justify-center">
        <svg className="animate-spin h-7 w-7 text-gray-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );

  if (notFound)
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Train size={40} className="mx-auto mb-4 text-gray-300" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ticket not found</h1>
          <p className="text-sm text-gray-500 mb-5">This listing may have been removed.</p>
          <button
            onClick={() => navigate("/browse")}
            className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-800 transition"
          >
            Back to Browse
          </button>
        </div>
      </div>
    );

  const duration = getDuration(ticket.departureTime, ticket.arrivalTime);
  const isSold = !!ticket.sold;
  const isSentOrRequested = requestSent || alreadyRequested;

  return (
    <div className="min-h-screen bg-gray-50 pt-[80px] pb-12 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-6 flex-wrap">
          <Link to="/" className="hover:text-gray-700 transition">Home</Link>
          <ChevronRight size={14} />
          <Link to="/browse" className="hover:text-gray-700 transition">Browse Tickets</Link>
          <ChevronRight size={14} />
          <span className="text-gray-700 font-medium truncate max-w-[200px]">{ticket.trainName}</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Left column ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-5">

            {/* Sold banner — shown at the top of the left column */}
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
                : "bg-white border-gray-200"
            }`}>

              {/* Header */}
              <div className="flex items-start justify-between mb-5 gap-3">
                <div className="min-w-0">
                  <h1 className={`text-xl md:text-2xl font-bold truncate ${
                    isSold ? "text-yellow-900" : "text-gray-900"
                  }`}>
                    {ticket.trainName || "—"}
                  </h1>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                    <Train size={13} />
                    <span>{ticket.trainNumber || "—"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-xs border px-2.5 py-1 rounded-full ${
                    isSold
                      ? "border-yellow-300 text-yellow-700 bg-yellow-100"
                      : "border-gray-200 text-gray-600"
                  }`}>
                    {ticket.trainClass}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    isSold
                      ? "bg-yellow-400 text-yellow-900"
                      : "bg-black text-white"
                  }`}>
                    {isSold ? "Sold" : (ticket.status || "Active")}
                  </span>
                </div>
              </div>

              {/* Time box */}
              <div className={`border rounded-xl p-4 md:p-5 mb-5 ${
                isSold
                  ? "bg-yellow-100 border-yellow-200"
                  : "bg-gray-50 border-gray-100"
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-center">
                    <p className={`text-2xl md:text-3xl font-bold ${
                      isSold ? "text-yellow-800" : "text-gray-900"
                    }`}>
                      {ticket.departureTime || "—"}
                    </p>
                    <p className={`text-sm font-medium mt-1 ${
                      isSold ? "text-yellow-700" : "text-gray-700"
                    }`}>{ticket.from || "—"}</p>
                    <p className="text-xs text-gray-400">Departure</p>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1 px-2">
                    {duration && (
                      <span className="text-xs text-gray-400 font-medium">{duration}</span>
                    )}
                    <div className="flex items-center w-full gap-1">
                      <div className={`flex-1 h-px ${isSold ? "bg-yellow-300" : "bg-gray-300"}`} />
                      <Train size={16} className={isSold ? "text-yellow-400 flex-shrink-0" : "text-gray-400 flex-shrink-0"} />
                      <div className={`flex-1 h-px ${isSold ? "bg-yellow-300" : "bg-gray-300"}`} />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl md:text-3xl font-bold ${
                      isSold ? "text-yellow-800" : "text-gray-900"
                    }`}>
                      {ticket.arrivalTime || "—"}
                    </p>
                    <p className={`text-sm font-medium mt-1 ${
                      isSold ? "text-yellow-700" : "text-gray-700"
                    }`}>{ticket.to || "—"}</p>
                    <p className="text-xs text-gray-400">Arrival</p>
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-5">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    <Calendar size={12} /> Journey Date
                  </div>
                  <p className={`text-sm font-semibold ${isSold ? "text-yellow-800" : "text-gray-900"}`}>
                    {ticket.journeyDate || "—"}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    <Clock size={12} /> Duration
                  </div>
                  <p className={`text-sm font-semibold ${isSold ? "text-yellow-800" : "text-gray-900"}`}>
                    {duration || "—"}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    <Users size={12} /> Seats Available
                  </div>
                  <p className={`text-sm font-semibold ${isSold ? "text-yellow-800" : "text-gray-900"}`}>
                    {ticket.seats}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    <MapPin size={12} /> From
                  </div>
                  <p className={`text-sm font-semibold ${isSold ? "text-yellow-800" : "text-gray-900"}`}>
                    {ticket.from || "—"}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    <MapPin size={12} /> To
                  </div>
                  <p className={`text-sm font-semibold ${isSold ? "text-yellow-800" : "text-gray-900"}`}>
                    {ticket.to || "—"}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    <Train size={12} /> Class
                  </div>
                  <p className={`text-sm font-semibold ${isSold ? "text-yellow-800" : "text-gray-900"}`}>
                    {ticket.trainClass || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            {ticket.description && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info size={16} className="text-gray-600" />
                  <h2 className="text-sm font-bold text-gray-900">Additional Information</h2>
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Description
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">{ticket.description}</p>
              </div>
            )}
          </div>

          {/* ── Right column ── */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="lg:sticky lg:top-[90px] flex flex-col gap-4">
              <div className={`border rounded-2xl p-5 ${
                isSold
                  ? "bg-yellow-50 border-2 border-yellow-300"
                  : "bg-white border-gray-200"
              }`}>

                <p className="text-xs text-gray-400 mb-1">Price per seat</p>
                <p className={`text-3xl font-bold mb-1 ${isSold ? "text-yellow-800" : "text-gray-900"}`}>
                  ₹{ticket.price}
                </p>
                <p className="text-xs text-gray-400 mb-5">
                  Total for {ticket.seats}: ₹{Number(ticket.price) * parseInt(ticket.seats)}
                </p>

                <div className={`border-t mb-4 ${isSold ? "border-yellow-200" : "border-gray-100"}`} />

                <p className="text-xs text-gray-400 mb-2">Listed by</p>
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                    {getInitials(ticket.fullName)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{ticket.fullName || "—"}</p>
                  </div>
                </div>

                {/* CTA area — sold state takes priority over request state */}
                {isSold ? (
                  <div className="flex flex-col gap-3">
                    <div className="w-full flex items-center justify-center gap-2 bg-yellow-100 border-2 border-yellow-300 text-yellow-800 text-sm font-semibold py-3 rounded-xl">
                      <BadgeCheck size={16} />
                      Ticket Sold
                    </div>
                    <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                      This ticket is no longer available. Browse other listings to find a similar route.
                    </p>
                    <button
                      onClick={() => navigate("/browse")}
                      className="w-full flex items-center justify-center gap-1.5 border border-gray-200 text-gray-700 text-xs font-medium py-2.5 rounded-xl hover:bg-gray-50 transition"
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
                    <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                      The seller will review your request. You'll be able to see their contact details once approved.
                    </p>
                    <Link
                      to="/my-requests"
                      className="w-full flex items-center justify-center gap-1.5 border border-gray-200 text-gray-700 text-xs font-medium py-2.5 rounded-xl hover:bg-gray-50 transition"
                    >
                      <Bell size={14} />
                      View my requests
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={handleContact}
                    disabled={requesting}
                    className="w-full flex items-center justify-center gap-2 bg-black text-white text-sm font-semibold py-3 rounded-xl hover:bg-gray-800 disabled:opacity-60 transition mb-3"
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
                  className="w-full flex items-center justify-center gap-1.5 border border-gray-200 text-gray-700 text-xs font-medium py-2.5 rounded-xl hover:bg-gray-50 transition mt-3"
                >
                  <Share2 size={14} />
                  {copied ? "Link Copied!" : "Share"}
                </button>

                {!isAuthenticated && !isSold && (
                  <p className="text-[11px] text-gray-400 text-center mt-3 leading-relaxed">
                    You'll be redirected to login before contacting the seller.
                  </p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TicketDetailPage;