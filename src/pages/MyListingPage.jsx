import { useEffect, useState } from "react";
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
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  Train,
  ArrowRight,
  Clock,
  Users,
  Plus,
  LayoutGrid,
  Trash2,
} from "lucide-react";
import { KineticText } from "@/components/ui/kinetic-text";

const MyListingsPage = () => {
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    loginWithRedirect,
  } = useAuth0();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user?.email) {
      setLoading(false);
      return;
    }

    const fetchMyTickets = async () => {
      try {
        const q = query(
          collection(db, "tickets"),
          where("email", "==", user.email.toLowerCase()),
          orderBy("createdAt", "desc"),
        );
        const snapshot = await getDocs(q);
        setTickets(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching listings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyTickets();
  }, [authLoading, isAuthenticated, user]);

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
      await deleteDoc(doc(db, "tickets", ticketId));
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    } catch (err) {
      console.error("Error deleting ticket:", err);
      alert("Failed to delete listing. Please try again.");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  // ── Loading ──
  if (authLoading || loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <svg
          className="animate-spin h-7 w-7 text-gray-400"
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
    );

  // ── Not logged in ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <LayoutGrid size={20} className="text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            You're not logged in
          </h1>
          <p className="text-sm text-gray-500 mb-5">
            Log in to view your dashboard and listings.
          </p>
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

  // ── Logged in ──
  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 sm:px-6 py-8 md:py-12 mt-[60px]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <KineticText
              text="Your Listings"
              className="text-[2.25rem] sm:text-[3.25rem] md:text-[4.5rem] tracking-[-5%] flex items-start justify-start"
            />
            <p className="text-sm text-gray-500  mt-1 break-all sm:break-normal">
              {tickets.length} listing{tickets.length !== 1 ? "s" : ""} ·{" "}
              {user.name}
            </p>
          </div>
          <button
            onClick={() => navigate("/create-listing")}
            className="flex items-center justify-center gap-1.5 text-sm font-medium  px-4 py-2.5 rounded-[10px]  transition flex-shrink-0 w-full sm:w-auto 
            border
            bg-black
            text-white
            dark:bg-white
            hover:bg-[var(--color-surface-hover-switch)]
            hover:dark:bg-gray-200
            duration-200
           
            dark:text-black
            "
            
            
          >
            <Plus size={16} />
            List a Ticket
          </button>
        </div>

        {/* Empty state */}
        {tickets.length === 0 ? (
          <div className="text-center py-16 md:py-24 bg-[var(--color-surface)] text-gray-400 border border-[var(--color-border)] rounded-2xl px-4">
            <Train size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium ">
              You haven't listed any tickets yet
            </p>
            <p className="text-xs mt-1">
              Click "List a Ticket" to create your first listing
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tickets.map((ticket) => {
              const duration = getDuration(
                ticket.departureTime,
                ticket.arrivalTime,
              );
              const isConfirming = confirmId === ticket.id;
              const isDeleting = deletingId === ticket.id;

              return (
                <div
                  key={ticket.id}
                  className="relative bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 hover:shadow-md hover:border-gray-300 transition"
                >
                  {/* Top */}
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="min-w-0 ">
                      <h3 className="font-bold text-gray-900 text-sm truncate">
                        {ticket.trainName || "—"}

                      </h3>
                      <p className="text-gray-400 text-[13px]">{ticket.trainNumber}</p>

                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full whitespace-nowrap">
                        {ticket.trainClass}
                      </span>
                      <span className="text-xs bg-black text-white px-2.5 py-1 rounded-full whitespace-nowrap">
                        {ticket.status || "Active"}
                      </span>
                    </div>
                  </div>

                  {/* Time row */}
                  <div className="flex items-center gap-2 sm:gap-3 mb-3">
                    <div>
                      <p className="text-lg sm:text-xl font-bold text-gray-900">
                        {ticket.departureTime || "—"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {ticket.from || "—"}
                      </p>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                      {duration && (
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {duration}
                        </span>
                      )}
                      <div className="flex items-center w-full gap-1">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-gray-300 text-xs">→</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg sm:text-xl font-bold text-gray-900">
                        {ticket.arrivalTime || "—"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {ticket.to || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Date + seats */}
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-4 flex-wrap">
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
                  <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-400 truncate">
                      Listed{" "}
                      {ticket.createdAt?.toDate
                        ? ticket.createdAt.toDate().toLocaleDateString()
                        : "—"}
                    </p>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-bold text-gray-900">
                        ₹{ticket.price}
                      </p>
                      <p className="text-[10px] text-gray-400">per seat</p>
                    </div>
                  </div>

                  {/* Remove button / confirm bar */}
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
                          <>
                            <svg
                              className="animate-spin h-3.5 w-3.5"
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
                            Removing...
                          </>
                        ) : (
                          "Confirm Remove"
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        disabled={isDeleting}
                        className="flex-1 text-xs font-medium text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition"
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
      </div>
    </div>
  );
};

export default MyListingsPage;