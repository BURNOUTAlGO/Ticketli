import { useEffect, useState, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { db } from "../firebase";
import {
  collection, getDocs, query, where, orderBy,
  deleteDoc, doc, updateDoc, writeBatch, addDoc, serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  Train, ArrowRight, Clock, Users, Plus, LayoutGrid,
  Trash2, Bell, Check, X, Mail, AlertTriangle,
} from "lucide-react";
import { KineticText } from "@/components/ui/kinetic-text";

const EXPIRY_WINDOW_DAYS = 2;

const MyListingPage = () => {
  const { user, isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("listings"); // "listings" | "requests"
  const navigate = useNavigate();
  const hasFetchedRef = useRef(false);

  // Returns true if a ticket's journeyDate is today+EXPIRY_WINDOW_DAYS or earlier (i.e. should be auto-removed)
  const isExpiring = (journeyDate) => {
    if (!journeyDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const journey = new Date(journeyDate); // works for "YYYY-MM-DD"
    if (isNaN(journey.getTime())) return false;
    journey.setHours(0, 0, 0, 0);

    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + EXPIRY_WINDOW_DAYS);

    // Ticket expires once its journey date is within the window (or already past)
    return journey <= cutoff;
  };

  // Deletes a ticket + its related contactRequests, and logs a notification doc.
  // Idempotent: if a notification for this ticket already exists, skip writing another.
  const expireTicket = async (ticket) => {
    const existingNotifQuery = query(
      collection(db, "notifications"),
      where("ticketId", "==", ticket.id),
      where("type", "==", "expired")
    );
    const existingNotifSnap = await getDocs(existingNotifQuery);

    const rq = query(
      collection(db, "contactRequests"),
      where("ticketId", "==", ticket.id)
    );
    const rsnap = await getDocs(rq);

    const batch = writeBatch(db);
    batch.delete(doc(db, "tickets", ticket.id));
    rsnap.docs.forEach((d) => batch.delete(doc(db, "contactRequests", d.id)));
    await batch.commit();

    if (existingNotifSnap.empty) {
      await addDoc(collection(db, "notifications"), {
        sellerEmail: ticket.email,
        type: "expired",
        ticketId: ticket.id,
        ticketName: ticket.trainName || ticket.trainNumber || "Your ticket",
        from: ticket.from || "",
        to: ticket.to || "",
        journeyDate: ticket.journeyDate || "",
        createdAt: serverTimestamp(),
      });
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user?.email) { setLoading(false); return; }
    if (hasFetchedRef.current) return; // guard against Strict Mode's double-invoke
    hasFetchedRef.current = true;

    const fetchAll = async () => {
      try {
        // Fetch my tickets
        const q = query(
          collection(db, "tickets"),
          where("email", "==", user.email.toLowerCase()),
          orderBy("createdAt", "desc"),
        );
        const snap = await getDocs(q);
        const allTickets = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Partition into valid vs expiring tickets
        const validTickets = [];
        const expiringTickets = [];
        allTickets.forEach((t) => {
          if (isExpiring(t.journeyDate)) expiringTickets.push(t);
          else validTickets.push(t);
        });

        // Clean up expiring tickets (delete ticket + requests, log notification)
        if (expiringTickets.length > 0) {
          await Promise.all(expiringTickets.map((t) => expireTicket(t)));
        }

        setTickets(validTickets);

        // Fetch contact requests for my (remaining) tickets
        const rq = query(
          collection(db, "contactRequests"),
          where("sellerEmail", "==", user.email.toLowerCase()),
          orderBy("createdAt", "desc"),
        );
        const rsnap = await getDocs(rq);
        setRequests(rsnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // Fetch notifications (includes ones we just created above)
        const nq = query(
          collection(db, "notifications"),
          where("sellerEmail", "==", user.email.toLowerCase()),
          orderBy("createdAt", "desc"),
        );
        const nsnap = await getDocs(nq);
        setNotifications(nsnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [authLoading, isAuthenticated, user]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const unseenNotifCount = notifications.length; // all surfaced notifications count toward the badge
  const requestsTabBadge = pendingCount + unseenNotifCount;

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

  const handleDelete = async (ticketId) => {
    setDeletingId(ticketId);
    try {
      // Find all contact requests tied to this ticket
      const rq = query(
        collection(db, "contactRequests"),
        where("ticketId", "==", ticketId)
      );
      const rsnap = await getDocs(rq);

      // Batch delete: the ticket itself + all related requests
      const batch = writeBatch(db);
      batch.delete(doc(db, "tickets", ticketId));
      rsnap.docs.forEach((d) => batch.delete(doc(db, "contactRequests", d.id)));
      await batch.commit();

      // Update local state to match
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      setRequests((prev) => prev.filter((r) => r.ticketId !== ticketId));
    } catch (err) {
      console.error("Error deleting ticket:", err);
      alert("Failed to delete listing. Please try again.");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      await updateDoc(doc(db, "contactRequests", requestId), {
        status: action, // "approved" | "rejected"
      });
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: action } : r))
      );
    } catch (err) {
      console.error("Failed to update request:", err);
    }
  };

  const handleDismissNotification = async (notifId) => {
    try {
      await deleteDoc(doc(db, "notifications", notifId));
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    } catch (err) {
      console.error("Failed to dismiss notification:", err);
    }
  };

  // ── Loading ──
  if (authLoading || loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <svg className="animate-spin h-7 w-7 text-gray-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );

  // ── Not logged in ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <LayoutGrid size={20} className="text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">You're not logged in</h1>
          <p className="text-sm text-gray-500 mb-5">Log in to view your dashboard and listings.</p>
          <button
            onClick={() => loginWithRedirect()}
            className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-800 transition"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 sm:px-6 py-8 md:py-12 mt-[60px]">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <KineticText
              text="Your Listings"
              className="text-[2.25rem] sm:text-[3.25rem] md:text-[4.5rem] tracking-[-5%] flex items-start justify-start"
            />
            <p className="text-sm text-neutral-400 mt-1 break-all sm:break-normal">
              {tickets.length} listing{tickets.length !== 1 ? "s" : ""} · {user.name}
            </p>
          </div>
          <button
            onClick={() => navigate("/create-listing")}
            className="flex items-center justify-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-[10px] transition flex-shrink-0 w-full sm:w-auto border bg-black text-white dark:bg-white hover:bg-[var(--color-surface-hover-switch)] hover:dark:bg-gray-200 duration-200 dark:text-black"
          >
            <Plus size={16} />
            List a Ticket
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("listings")}
            className={`pb-3 px-1 text-sm font-medium transition border-b-2 -mb-px ${
              activeTab === "listings"
                ? "border-black text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            My Listings
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`pb-3 px-1 text-sm font-medium transition border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === "requests"
                ? "border-black text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <Bell size={14} />
            Requests
            {requestsTabBadge > 0 && (
              <span className="bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {requestsTabBadge}
              </span>
            )}
          </button>
        </div>

        {/* ── MY LISTINGS TAB ── */}
        {activeTab === "listings" && (
          <>
            {tickets.length === 0 ? (
              <div className="text-center py-16 md:py-24 bg-[var(--color-surface)] text-gray-400 border border-[var(--color-border)] rounded-[10px] px-4">
                <Train size={36} className="mx-auto mb-3 opacity-20 text-neutral-400" />
                <p className="text-sm text-neutral-400">You haven't listed any tickets yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tickets.map((ticket) => {
                  const duration = getDuration(ticket.departureTime, ticket.arrivalTime);
                  const isConfirming = confirmId === ticket.id;
                  const isDeleting = deletingId === ticket.id;
                  const ticketRequests = requests.filter(
                    (r) => r.ticketId === ticket.id && r.status === "pending"
                  );

                  return (
                    <div
                      key={ticket.id}
                      className="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[10px] p-4 sm:p-5 hover:shadow-md transition"
                    >
                      {/* Pending requests badge */}
                      {ticketRequests.length > 0 && (
                        <div className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10">
                          {ticketRequests.length} request{ticketRequests.length > 1 ? "s" : ""}
                        </div>
                      )}

                      {/* Top */}
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div className="min-w-0">
                          <h3 className="font-mono font-semibold text-sm truncate">
                            {ticket.trainName || "—"}
                          </h3>
                          <p className="text-neutral-400 font-mono text-[13px]">{ticket.trainNumber}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs border border-[var(--color-border)] text-gray-600 dark:text-neutral-400 px-2.5 py-1 rounded-full whitespace-nowrap">
                            {ticket.trainClass}
                          </span>
                          <span className="text-xs bg-black dark:bg-[var(--color-3)] text-white px-2.5 py-1 rounded-full whitespace-nowrap">
                            {ticket.status || "Active"}
                          </span>
                        </div>
                      </div>

                      {/* Time row */}
                      <div className="flex items-center gap-2 sm:gap-3 mb-3">
                        <div>
                          <p className="text-lg sm:text-xl font-semibold">{ticket.departureTime || "—"}</p>
                          <p className="text-xs font-mono truncate">{ticket.from || "—"}</p>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                          {duration && <span className="text-xs text-gray-400 whitespace-nowrap">{duration}</span>}
                          <div className="flex items-center w-full gap-1">
                            <div className="flex-1 h-px bg-black dark:bg-[var(--color-border)]" />
                            <span className="text-black dark:text-white text-xl">→</span>
                            <div className="flex-1 h-px bg-black dark:bg-[var(--color-border)]" />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg sm:text-xl font-semibold">{ticket.arrivalTime || "—"}</p>
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
                          <span>{ticket.seats} available</span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="border-t border-[var(--color-border)] pt-3 flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-400 dark:text-neutral-400 font-mono truncate">
                          Listed {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : "—"}
                        </p>
                        <div className="text-right flex-shrink-0">
                          <p className="text-base font-mono">₹{ticket.price}</p>
                          <p className="text-[10px] text-gray-400 dark:text-neutral-400">per seat</p>
                        </div>
                      </div>

                      {/* Remove button */}
                      {!isConfirming ? (
                        <button
                          onClick={() => setConfirmId(ticket.id)}
                          className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-red-600 border border-red-100 bg-red-50 px-3 py-2 rounded-lg hover:bg-red-100 transition"
                        >
                          <Trash2 size={13} />
                          Remove Listing
                        </button>
                      ) : (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => handleDelete(ticket.id)}
                            disabled={isDeleting}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-red-600 px-3 py-2 rounded-lg hover:bg-red-700 disabled:opacity-60 transition"
                          >
                            {isDeleting ? (
                              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                              </svg>
                            ) : "Confirm Remove"}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            disabled={isDeleting}
                            className="flex-1 text-xs font-medium border border-gray-200 px-3 py-2 rounded-lg disabled:opacity-60 transition bg-black text-white dark:bg-white dark:text-black hover:bg-[var(--color-surface-hover-switch)] hover:dark:bg-gray-200 duration-200"
                          >
                            Cancel
                          </button>
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
              <div className="text-center py-16 md:py-24 text-gray-400 border border-gray-100 rounded-2xl px-4">
                <Bell size={36} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium text-gray-600">No contact requests yet</p>
                <p className="text-xs mt-1">When buyers request to contact you, they'll appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">

                {/* System notifications (e.g. auto-expired listings) */}
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle size={15} className="text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          Listing auto-removed
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {notif.ticketName} ({notif.from} → {notif.to}) was removed because the
                          journey date ({notif.journeyDate}) was within {EXPIRY_WINDOW_DAYS} days.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDismissNotification(notif.id)}
                      className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                      aria-label="Dismiss notification"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}

                {/* Contact requests */}
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">

                      {/* Left: buyer info + ticket info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                            {req.buyerName?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{req.buyerName}</p>
                            <p className="text-xs text-gray-400">{req.buyerEmail}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
                          <span className="font-medium text-gray-700">{req.ticketName}</span>
                          <span className="text-gray-300">·</span>
                          <span>{req.from} → {req.to}</span>
                          <span className="text-gray-300">·</span>
                          <span>{req.journeyDate}</span>
                          <span className="text-gray-300">·</span>
                          <span className="font-medium">₹{req.price}/seat</span>
                        </div>
                      </div>

                      {/* Right: status or actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {req.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleRequestAction(req.id, "approved")}
                              className="flex items-center gap-1.5 bg-black text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-800 transition"
                            >
                              <Check size={13} />
                              Approve
                            </button>
                            <button
                              onClick={() => handleRequestAction(req.id, "rejected")}
                              className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition"
                            >
                              <X size={13} />
                              Reject
                            </button>
                          </>
                        )}

                        {req.status === "approved" && (
                          <div className="flex flex-col items-end gap-2">
                            <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
                              <Check size={12} /> Approved
                            </span>
                            <a
                              href={`mailto:${req.buyerEmail}?subject=Your ticket request for ${req.ticketName} has been approved&body=Hi ${req.buyerName},%0D%0A%0D%0AYour request for the ${req.ticketName} from ${req.from} to ${req.to} on ${req.journeyDate} has been approved.%0D%0A%0D%0APlease contact me to proceed with the purchase.%0D%0A%0D%0AThank you!`}
                              className="flex items-center gap-1.5 bg-black text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-800 transition"
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
  );
};

export default MyListingPage;