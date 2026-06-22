import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
  addDoc,
  serverTimestamp,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  Train,
  Clock,
  Users,
  Plus,
  LayoutGrid,
  Bell,
  Check,
  X,
  Mail,
  AlertTriangle,
  BadgeCheck,
} from "lucide-react";
import { KineticText } from "@/components/ui/kinetic-text";

// ── Shared theme tokens (same system as CreateListingPage) ─────────────────
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
      border-radius: 10px;
    }
    .rail-tab-active {
      color: var(--rail-orange);
      border-color: var(--rail-orange);
    }
    .rail-badge {
      background: var(--rail-orange);
      color: #ffffff;
    }
  `}</style>
);

const MyListingPage = () => {
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    loginWithRedirect,
  } = useAuth0();
  const [tickets, setTickets] = useState([]);
  const [soldTickets, setSoldTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("listings");

  const navigate = useNavigate();

  // ── data fetch ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user?.email) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      try {
const ticketsQuery = query(
  collection(db, "tickets"),
  where("email", "==", user.email.toLowerCase()),
  orderBy("createdAt", "desc")
);

const unsubscribeTickets = onSnapshot(
  ticketsQuery,
  (snapshot) => {
    const allTickets = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    const activeTickets = allTickets.filter(
      (t) => !t.sold
    );

    setTickets(activeTickets);
  }
);

const soldQuery = query(
  collection(db, "soldTickets"),
  where("sellerEmail", "==", user.email.toLowerCase()),
  orderBy("soldAt", "desc"),
);

const unsubscribeSoldTickets = onSnapshot(
  soldQuery,
  (snapshot) => {
    setSoldTickets(
      snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))
    );
  }
);

        const rq = query(
          collection(db, "contactRequests"),
          where("sellerEmail", "==", user.email.toLowerCase()),
        );

        const unsubscribeRequests = onSnapshot(rq, (snapshot) => {
          console.log("Seller:", user.email.toLowerCase());

          console.log(
            "Requests Found:",
            snapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })),
          );

          setRequests(
            snapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })),
          );
        });
        const nq = query(
          collection(db, "notifications"),
          where("sellerEmail", "==", user.email.toLowerCase()),
          orderBy("createdAt", "desc"),
        );

        const unsubscribeNotifications = onSnapshot(nq, (snapshot) => {
          setNotifications(
            snapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })),
          );
        });
        return () => {
          unsubscribeTickets();
          unsubscribeRequests();
          unsubscribeNotifications();
          unsubscribeSoldTickets();
          
        };
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [authLoading, isAuthenticated, user]);

  // ── actions ───────────────────────────────────────────────────────────────

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

  const handleMarkSold = async (ticketId) => {
    try {
      const ticket = tickets.find((t) => t.id === ticketId);

      await updateDoc(doc(db, "tickets", ticketId), {
        sold: true,
        soldAt: serverTimestamp(),
      });
      const rq = query(
        collection(db, "contactRequests"),
        where("ticketId", "==", ticketId),
      );

      const rsnap = await getDocs(rq);

const nq = query(
  collection(db, "notifications"),
  where("ticketId", "==", ticketId),
);
      const nsnap = await getDocs(nq);

      const batch = writeBatch(db);

      rsnap.docs.forEach((r) => {
        batch.delete(doc(db, "contactRequests", r.id));
      });

      nsnap.docs.forEach((n) => {
        batch.delete(doc(db, "notifications", n.id));
      });

      await batch.commit();
      if (ticket?.pnrNumber) {
        await setDoc(doc(db, "soldPnrs", ticket.pnrNumber), {
          pnrNumber: ticket.pnrNumber,
          journeyDate: ticket.journeyDate,
          soldAt: serverTimestamp(),
          originalTicketId: ticketId,
          sellerEmail: ticket.email || user?.email?.toLowerCase() || null,
        });
        await addDoc(collection(db, "soldTickets"), {
          ticketId: ticket.id,
          sellerEmail: user.email.toLowerCase(),
          trainName: ticket.trainName,
          trainNumber: ticket.trainNumber,
          trainClass: ticket.trainClass,
          from: ticket.from,
          to: ticket.to,
          departureTime: ticket.departureTime,
          arrivalTime: ticket.arrivalTime,
          journeyDate: ticket.journeyDate,
          price: ticket.price,
          seats: ticket.seats,
          createdAt: ticket.createdAt || serverTimestamp(),
          soldAt: serverTimestamp(),
          expiresAt: Date.now() + 8 * 60 * 60 * 1000,
        });
      }



      setConfirmId(null);
    } catch (err) {
      console.error("Error marking ticket as sold:", err);
      alert("Failed to mark ticket as sold. Please try again.");
    }
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      await updateDoc(doc(db, "contactRequests", requestId), {
  status: action,
});
    } catch (err) {
      console.error("Failed to update request:", err);
    }
  };

  const handleDismissNotification = async (notifId) => {
    try {
      await deleteDoc(doc(db, "notifications", notifId));
    } catch (err) {
      console.error("Failed to dismiss notification:", err);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const unseenNotifCount = notifications.length;
  const requestsTabBadge = pendingCount + unseenNotifCount;

  // ── loading / auth guards ─────────────────────────────────────────────────

  if (authLoading || loading)
    return (
      <>
        <ThemeStyles />
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
          <svg
            className="animate-spin h-7 w-7"
            style={{ color: "var(--rail-orange)" }}
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
        </div>
      </>
    );

  if (!isAuthenticated) {
    return (
      <>
        <ThemeStyles />
        <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-bg)]">
          <div className="text-center max-w-sm">
            <div className="w-12 h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center mx-auto mb-4">
              <LayoutGrid size={20} className="text-[var(--color-text-subtle)]" />
            </div>
            <h1 className="text-xl font-bold text-[var(--color-text)] mb-2 font-mono">
              You're not logged in
            </h1>
            <p className="text-sm text-[var(--color-text-subtle)] mb-5">
              Log in to view your dashboard and listings.
            </p>
            <button
              onClick={() => loginWithRedirect()}
              className="rail-btn-primary text-sm font-medium px-5 py-2.5 rounded-lg transition"
            >
              Log In
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── ticket card shared body (UNCHANGED — original theme preserved) ───────

  const TicketCardBody = ({ ticket, isSold = false }) => {
    const duration = getDuration(ticket.departureTime, ticket.arrivalTime);
    return (
      <>
        {/* Top */}
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="min-w-0">
            <h3 className="font-mono font-semibold text-sm truncate">
              {ticket.trainName || "—"}
            </h3>
            <p className="text-neutral-400 font-mono text-[13px]">
              {ticket.trainNumber}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className={`text-xs border px-2.5 py-1 rounded-full whitespace-nowrap ${
                isSold
                  ? "border-yellow-300 text-yellow-700 bg-yellow-50"
                  : "border-[var(--color-border)] text-gray-600 dark:text-neutral-400"
              }`}
            >
              {ticket.trainClass}
            </span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap font-medium ${
                isSold
                  ? "bg-yellow-400 text-yellow-900"
                  : "bg-[#FF6B1A] dark:bg-[#FF6B1A] text-white"
              }`}
            >
              {isSold ? "Sold" : ticket.status || "Active"}
            </span>
          </div>
        </div>

        {/* Time row */}
        <div className="flex items-center gap-2 sm:gap-3 mb-3">
          <div>
            <p
              className={`text-lg sm:text-xl font-semibold ${isSold ? "text-yellow-800" : ""}`}
            >
              {ticket.departureTime || "—"}
            </p>
            <p className="text-xs font-mono truncate">{ticket.from || "—"}</p>
          </div>
          <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
            {duration && (
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {duration}
              </span>
            )}
            <div className="flex items-center w-full gap-1">
              <div
                className={`flex-1 h-px ${isSold ? "bg-yellow-300" : "bg-black dark:bg-[var(--color-border)]"}`}
              />
              <span
                className={`text-xl ${isSold ? "text-yellow-500" : "text-black dark:text-white"}`}
              >
                →
              </span>
              <div
                className={`flex-1 h-px ${isSold ? "bg-yellow-300" : "bg-black dark:bg-[var(--color-border)]"}`}
              />
            </div>
          </div>
          <div className="text-right">
            <p
              className={`text-lg sm:text-xl font-semibold ${isSold ? "text-yellow-800" : ""}`}
            >
              {ticket.arrivalTime || "—"}
            </p>
            <p className="text-xs font-mono truncate">{ticket.to || "—"}</p>
          </div>
        </div>

        {/* Date + seats */}
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-neutral-400 mb-4 flex-wrap font-mono">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{ticket.journeyDate || "—"}</span>
          </div>
          <span>·</span>
          <div className="flex items-center gap-1">
            <Users size={12} />
            <span> {isSold ? ticket.seats : `${ticket.seats} available`}</span>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`border-t pt-3 flex items-center justify-between gap-2 ${
            isSold ? "border-yellow-200" : "border-[var(--color-border)]"
          }`}
        >
          <p className="text-xs text-gray-400 dark:text-neutral-400 font-mono truncate">
            Listed -{" "}
            {ticket.createdAt?.toDate
              ? ticket.createdAt.toDate().toLocaleDateString()
              : ticket.createdAt
                ? new Date(ticket.createdAt.seconds * 1000).toLocaleDateString()
                : "—"}
          </p>
          <div className="text-right flex-shrink-0">
            <p className="text-base font-mono">₹{ticket.price}</p>
            <p className="text-[10px] text-gray-400 dark:text-neutral-400">
              per seat
            </p>
          </div>
        </div>
      </>
    );
  };

  // ── render ────────────────────────────────────────────────────────────────

  const totalListingCount = tickets.length + soldTickets.length;

  return (
    <>
      <ThemeStyles />
      <div
        className="min-h-screen bg-[var(--color-bg)] px-4 sm:px-6 md:px-8 pb-10 sm:pb-14"
        style={{ paddingTop: "calc(var(--navbar-height, 64px) + 1.5rem)" }}
      >
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <KineticText
                text="Your Listings"
                className="text-[2.1rem] sm:text-[2.85rem] md:text-[3.5rem] leading-tight tracking-[-3%] flex items-start justify-start"
              />
              <p className="text-sm text-[#c9c9c9] dark:text-[var(--color-text-subtle)] mt-2 font-mono break-all sm:break-normal">
                {tickets.length} active <span style={{ color: "var(--rail-orange)" }}>·</span>{" "}
                {soldTickets.length} sold <span style={{ color: "var(--rail-orange)" }}>·</span>{" "}
                {user.name}
              </p>
            </div>
            <button
              onClick={() => navigate("/create-listing")}
              className="rail-btn-primary flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-lg transition flex-shrink-0 w-full sm:w-auto"
            >
              <Plus size={16} />
              List a Ticket
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-5 sm:gap-6 mb-8 border-b border-[var(--color-border)]">
            <button
              onClick={() => setActiveTab("listings")}
              className={`pb-3 px-0.5 text-sm font-medium font-mono transition border-b-2 -mb-px ${
                activeTab === "listings"
                  ? "rail-tab-active"
                  : "border-transparent text-[var(--color-text-subtle)] hover:text-[var(--color-text)]"
              }`}
            >
              My Listings
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`pb-3 px-0.5 text-sm font-medium font-mono transition border-b-2 -mb-px flex items-center gap-2 ${
                activeTab === "requests"
                  ? "rail-tab-active"
                  : "border-transparent text-[var(--color-text-subtle)] hover:text-[var(--color-text)]"
              }`}
            >
              <Bell size={14} />
              Requests
              {requestsTabBadge > 0 && (
                <span className="rail-badge text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {requestsTabBadge}
                </span>
              )}
            </button>
          </div>

          {/* ── MY LISTINGS TAB ── */}
          {activeTab === "listings" && (
            <>
              {totalListingCount === 0 ? (
                <div className="text-center py-16 md:py-24 bg-[var(--color-surface)] text-[var(--color-text-subtle)] border border-[var(--color-border)] rounded-lg px-4">
                  <Train
                    size={36}
                    className="mx-auto mb-3 opacity-20 text-[var(--color-text-subtle)]"
                  />
                  <p className="text-sm text-[var(--color-text-subtle)] font-mono">
                    You haven't listed any tickets yet
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* ── SOLD TICKETS (yellow) shown first — UNCHANGED ── */}
                  {soldTickets.map((ticket) => {
                    return (
                      <div
                        key={ticket.id}
                        className="relative bg-yellow-50 border-2 border-yellow-300 rounded-[10px] p-4 sm:p-5 shadow-sm"
                      >
                        {/* Sold banner */}
                        <div className="flex items-center gap-2 bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-2 mb-3">
                          <BadgeCheck
                            size={15}
                            className="text-yellow-600 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-yellow-800">
                              Marked as Sold
                            </p>
                          </div>
                          {/* Progress bar showing time draining */}
                        </div>

                        <TicketCardBody ticket={ticket} isSold />
                      </div>
                    );
                  })}

                  {/* ── ACTIVE TICKETS — UNCHANGED ── */}
                  {tickets.map((ticket) => {
                    const isSoldConfirming = confirmId === ticket.id + "_sold";
                    const ticketRequests = requests.filter(
                      (r) => r.ticketId === ticket.id && r.status === "pending",
                    );

                    return (
                      <div
                        key={ticket.id}
                        className="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] p-4 sm:p-5 hover:shadow-md transition"
                      >
                        {ticketRequests.length > 0 && (
                          <div className="absolute h-[20px] w-[20px] text-center -top-2 -right-2 bg-orange-500 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full z-10">
                            {ticketRequests.length} 
                            
                          </div>
                        )}

                        <TicketCardBody ticket={ticket} />

                        {!isSoldConfirming ? (
                          <button
                            onClick={() => setConfirmId(ticket.id + "_sold")}
                            className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-green-700 border border-green-200 bg-green-50 px-3 py-2 rounded-lg hover:bg-green-100 transition"
                          >
                            <BadgeCheck size={13} />
                            Mark as Sold
                          </button>
                        ) : (
                          <div className="mt-3">
                   
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleMarkSold(ticket.id)}
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-green-600 px-3 py-2 rounded-lg hover:bg-green-700 transition"
                              >
                                <Check size={13} />
                                Confirm Sold
                              </button>
                              <button
                                onClick={() => setConfirmId(null)}
                                className="flex-1 text-xs font-medium border border-gray-200 px-3 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black hover:bg-[var(--color-surface-hover-switch)] hover:dark:bg-gray-200 duration-200 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── REQUESTS TAB ── */}
          {activeTab === "requests" && (
            <>
              {requests.length === 0 && notifications.length === 0 ? (
                <div className="text-center py-16 md:py-24 text-[var(--color-text-subtle)] border border-[var(--color-border)] bg-[var(--color-surface)] rounded-lg px-4">
                  <Bell size={36} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium font-mono text-[var(--color-text)]">
                    No contact requests yet
                  </p>
                  <p className="text-xs mt-1 text-[var(--color-text-subtle)]">
                    When buyers request to contact you, they'll appear here.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="rail-card border-l-2 p-4 sm:p-5 flex items-start justify-between gap-3"
                      style={{ borderLeftColor: "var(--rail-orange)" }}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: "var(--rail-orange-dim)" }}
                        >
                          <AlertTriangle size={15} style={{ color: "var(--rail-orange)" }} />
                        </div>
                        <div className="min-w-0">
                          {notif.type === "new_request" ? (
                            <>
                              <p className="text-sm font-semibold text-[var(--color-text)]">
                                New Contact Request
                              </p>

                              <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                                {notif.buyerName} requested contact for
                                {notif.ticketName}({notif.from} → {notif.to})
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-semibold text-[var(--color-text)]">
                                Listing auto-removed
                              </p>

                              <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                                {notif.ticketName} ({notif.from} → {notif.to}) was
                                removed because the journey date (
                                {notif.journeyDate}) was within 2 days.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDismissNotification(notif.id)}
                        className="text-[var(--color-text-subtle)] hover:text-[var(--color-text)] flex-shrink-0 transition"
                        aria-label="Dismiss notification"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}

                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="rail-card p-4 sm:p-5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
           {req.buyerPhoto ? (
    <img
      src={req.buyerPhoto}
      alt={req.buyerName}
      className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)] flex-shrink-0"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{ background: "var(--rail-orange-dim)", color: "var(--rail-orange)" }}
    >
      {req.buyerName
        ?.split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?"}
    </div>
  )}
                            <div>
                              <p className="text-sm font-semibold text-[var(--color-text)]">
                                {req.buyerName}
                              </p>
                              <p className="text-xs text-[var(--color-text-subtle)]">
                                {req.buyerEmail}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)] flex-wrap font-mono">
                            <span className="font-medium text-[var(--color-text)]">
                              {req.ticketName}
                            </span>
                            <span className="opacity-40">·</span>
                            <span>
                              {req.from} → {req.to}
                            </span>
                            <span className="opacity-40">·</span>
                            <span>{req.journeyDate}</span>
                            <span className="opacity-40">·</span>
                            <span className="font-medium">₹{req.price}/seat</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {req.status === "pending" && (
                            <>
                              <button
                                onClick={() =>
                                  handleRequestAction(req.id, "approved")
                                }
                                className="rail-btn-primary flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition"
                              >
                                <Check size={13} />
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  handleRequestAction(req.id, "rejected")
                                }
                                className="rail-focus flex items-center gap-1.5 border border-[var(--color-border)] text-[var(--color-text)] text-xs font-medium px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition"
                              >
                                <X size={13} />
                                Reject
                              </button>
                            </>
                          )}
                          {req.status === "approved" && (
                            <div className="flex flex-col items-end gap-2">
                              <span
                                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border"
                                style={{
                                  color: "var(--rail-orange)",
                                  background: "var(--rail-orange-dim)",
                                  borderColor: "var(--rail-orange-mid)",
                                }}
                              >
                                <Check size={12} /> Approved
                              </span>
                              <a
                                href={`mailto:${req.buyerEmail}?subject=Your ticket request for ${req.ticketName} has been approved&body=Hi ${req.buyerName},%0D%0A%0D%0AYour request for the ${req.ticketName} from ${req.from} to ${req.to} on ${req.journeyDate} has been approved.%0D%0A%0D%0APlease contact me to proceed with the purchase.%0D%0A%0D%0AThank you!`}
                                className="rail-btn-primary flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition"
                              >
                                <Mail size={12} />
                                Email Buyer
                              </a>
                            </div>
                          )}
                          {req.status === "rejected" && (
                            <span className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg">
                              <X size={12} /> Rejected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default MyListingPage;