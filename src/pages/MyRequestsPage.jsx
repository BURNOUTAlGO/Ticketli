import { useEffect, useState, useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { db } from "../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Bell, Train, CheckCircle, XCircle, Clock, Mail, Phone, Inbox } from "lucide-react";

const DISMISSED_KEY = "rejectedRequestsDismissed"; // localStorage key
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

// ── Shared theme tokens (same system as the other pages) ───────────────────
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
    .rail-filter-active {
      background: var(--rail-orange);
      color: #ffffff;
      border-color: var(--rail-orange);
    }
    .rail-filter-inactive {
      background: var(--color-surface);
      color: var(--color-text-subtle);
      border-color: var(--color-border);
    }
    .rail-filter-inactive:hover {
      color: var(--color-text);
      border-color: var(--color-text-subtle);
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

const FILTERS = [
  { key: "all",      label: "All" },
  { key: "pending",  label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

// ── Request card skeleton (mirrors the card layout below) ──────────────────
const RequestCardSkeleton = () => (
  <div className="rail-card rounded-xl p-4 sm:p-5 border-l-[3px] border-l-[var(--color-border)] skeleton-pulse">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="h-3.5 w-3.5 rounded bg-[var(--color-surface-hover)] flex-shrink-0" />
          <div className="h-3.5 w-32 rounded bg-[var(--color-surface-hover)]" />
        </div>
        <div className="h-2.5 w-44 rounded bg-[var(--color-surface-hover)]" />
      </div>
      <div className="h-7 w-24 rounded-lg bg-[var(--color-surface-hover)] flex-shrink-0" />
    </div>
  </div>
);

const MyRequestsPage = () => {
  const { user, isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();


  // Load dismissed map from localStorage: { [requestId]: firstSeenTimestamp }
  const getDismissedMap = () => {
    try {
      return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "{}");
    } catch {
      return {};
    }
  };
  const getInitials = (name) =>
    (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const markAsSeen = (rejectedIds) => {
    const map = getDismissedMap();
    let changed = false;
    rejectedIds.forEach((id) => {
      if (!map[id]) {
        map[id] = Date.now();
        changed = true;
      }
    });
    if (changed) localStorage.setItem(DISMISSED_KEY, JSON.stringify(map));
  };

  const isExpired = (id) => {
    const map = getDismissedMap();
    return map[id] && Date.now() - map[id] > TWENTY_FOUR_HOURS;
  };

 useEffect(() => {
  if (authLoading) return;

  if (!isAuthenticated || !user?.email) {
    setLoading(false);
    return;
  }

  const q = query(
    collection(db, "contactRequests"),
    where("buyerEmail", "==", user.email.toLowerCase())
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const all = snapshot.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
      }))
      .sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() || 0) -
          (a.createdAt?.toMillis?.() || 0)
      );

    const rejectedIds = all
      .filter((r) => r.status === "rejected")
      .map((r) => r.id);

    markAsSeen(rejectedIds);

    const visible = all.filter((r) => {
      if (r.status === "rejected") {
        return !isExpired(r.id);
      }
      return true;
    });

    setRequests(visible);
    setLoading(false);
  });

  return () => unsubscribe();
}, [authLoading, isAuthenticated, user]);

  const counts = useMemo(() => ({
    all:      requests.length,
    pending:  requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  }), [requests]);

  const filteredRequests = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  if (authLoading)
    return (
      <>
        <ThemeStyles />
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
          <svg className="animate-spin h-7 w-7" style={{ color: "var(--rail-orange)" }} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      </>
    );

  if (!isAuthenticated)
    return (
      <>
        <ThemeStyles />
        <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-bg)]">
          <div className="text-center max-w-sm">
            <h1 className="text-xl font-bold text-[var(--color-text)] mb-2 font-mono">You're not logged in</h1>
            <button onClick={() => loginWithRedirect()}
              className="rail-btn-primary text-sm font-medium px-5 py-2.5 rounded-lg transition">
              Log In
            </button>
          </div>
        </div>
      </>
    );

  const statusConfig = {
    pending:  { icon: Clock,        label: "Pending",  bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700", accent: "#EAB308" },
    approved: { icon: CheckCircle,  label: "Approved", bg: "bg-green-50 border-green-200",   text: "text-green-700",  accent: "#16A34A" },
    rejected: { icon: XCircle,      label: "Rejected", bg: "bg-red-50 border-red-100",       text: "text-red-500",    accent: "#EF4444" },
  };

  return (
    <>
      <ThemeStyles />
      <div
        className="min-h-screen bg-[var(--color-bg)] px-4 sm:px-6 pb-10 sm:pb-14"
        style={{ paddingTop: "calc(var(--navbar-height, 64px) + 1.5rem)" }}
      >
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-3 mb-1.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--rail-orange-dim)" }}
            >
              <Bell size={17} style={{ color: "var(--rail-orange)" }} />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text)] font-mono">My Requests</h1>
          </div>
          <p className="text-sm font-mono text-[#c9c9c9] dark:text-[var(--color-text-subtle)] mb-6 ml-12">
            {loading ? "Loading…" : `${requests.length} request${requests.length !== 1 ? "s" : ""} sent`}
          </p>

          {/* Filter tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                disabled={loading}
                className={`rail-focus flex items-center justify-center gap-1.5 text-xs font-medium font-mono px-3.5 py-2.5 sm:py-2 rounded-full border transition disabled:opacity-50 ${
                  filter === key ? "rail-filter-active" : "rail-filter-inactive"
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    filter === key ? "bg-white/20" : "bg-[var(--color-surface-hover)]"
                  }`}
                >
                  {loading ? "–" : counts[key]}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <RequestCardSkeleton key={i} />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 text-[var(--color-text-subtle)] border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl">
              <Bell size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">You haven't contacted any sellers yet.</p>
              <button onClick={() => navigate("/browse")}
                className="rail-btn-primary mt-4 text-sm font-medium px-5 py-2.5 rounded-lg transition">
                Browse Tickets
              </button>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-16 text-[#c9c9c9] dark:text-[var(--color-text-subtle)] border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl">
              <Inbox size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-mono">No {filter} requests right now.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredRequests.map((req) => {
                const { icon: Icon, label, bg, text, accent } = statusConfig[req.status] || statusConfig.pending;
                const isApproved = req.status === "approved";
                const isRejected = req.status === "rejected";

                return (
                  <div key={req.id}
                    className="rail-card rounded-xl p-4 sm:p-5 border-l-[3px]"
                    style={{ borderLeftColor: accent }}
                  >

                    {/* Ticket summary */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[var(--color-text)]">
                          <Train size={15} style={{ color: "var(--rail-orange)" }} />
                          <p className="font-medium truncate">{req.ticketName}</p>
                        </div>



                          <span className="text-xs text-[var(--color-text-subtle)] font-mono">{req.trainNumber}</span>


                        <p className="text-xs text-[var(--color-text-subtle)] mt-0.5 font-mono flex flex-wrap items-center gap-x-1">
                          <span>{req.from} → {req.to}</span>
                          <span>·</span>
                          <span>{req.journeyDate}</span>
                          <span>·</span>
                          <span>₹{req.price}/seat</span>
                        </p>

                      </div>

                      {/* Status badge */}
                      <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border flex-shrink-0 ${bg} ${text}`}>
                        <Icon size={13} />
                        {label}
                      </span>
                    </div>

                    {/* Seller contact — approved only */}
                    {isApproved && (
                      <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                        <p className="text-xs text-[var(--color-text-subtle)] uppercase tracking-wide mb-2 font-mono">
                          Seller contact
                        </p>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2.5">
                  {req.sellerPhoto ? (
    <img
      src={req.sellerPhoto}
      alt={req.sellerName}
      className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)] flex-shrink-0"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{ background: "var(--rail-orange-dim)", color: "var(--rail-orange)" }}
    >
      {getInitials(req.sellerName)}
    </div>
  )}

                            <p className="text-sm text-[var(--color-text)]">{req.sellerName}</p>
                          </div>


                          {/* Email */}
                          {req.sellerEmail && (
                            <a
                              href={`mailto:${req.sellerEmail}?subject=Re: ${req.ticketName} from ${req.from} to ${req.to}`}
                              className="rail-btn-primary flex items-center gap-2 text-xs font-medium px-3 py-2.5 rounded-lg transition min-w-0"
                            >
                              <Mail size={13} className="flex-shrink-0" />
                              <span className="truncate">{req.sellerEmail}</span>
                            </a>
                          )}

                          {/* Phone — email + call buttons side by side */}
                          {req.sellerPhone && (
                            <div className="flex items-center gap-2">
                              <span className="rail-focus flex-1 flex items-center gap-2 border border-[var(--color-border)] text-[var(--color-text)] text-xs font-medium px-3 py-2.5 rounded-lg min-w-0">
                                <Phone size={13} className="text-[var(--color-text-subtle)] flex-shrink-0" />
                                <span className="truncate">{req.sellerPhone}</span>
                              </span>

                              <a
                                href={`tel:${req.sellerPhone}`}
                                className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-medium px-4 py-2.5 rounded-lg hover:bg-green-700 transition flex-shrink-0"
                              >
                                <Phone size={13} />
                                Call
                              </a>
                            </div>
                          )}

                        </div>
                      </div>
                    )}

                    {/* Rejected message */}
                    {isRejected && (
                      <p className="mt-2 text-xs text-[var(--color-text-subtle)]">
                        The seller declined this request. This notice will disappear in 24 hours.
                      </p>
                    )}

                    {/* Pending message */}
                    {req.status === "pending" && (
                      <p className="mt-2 text-xs text-[var(--color-text-subtle)]">
                        Waiting for the seller to review your request.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MyRequestsPage;