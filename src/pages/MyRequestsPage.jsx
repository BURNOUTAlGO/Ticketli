import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Bell, Train, CheckCircle, XCircle, Clock, Mail, Phone } from "lucide-react";

const DISMISSED_KEY = "rejectedRequestsDismissed"; // localStorage key
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

const MyRequestsPage = () => {
  const { user, isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
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
    if (!isAuthenticated || !user?.email) { setLoading(false); return; }

    const fetchRequests = async () => {
      try {
        const q = query(
          collection(db, "contactRequests"),
          where("buyerEmail", "==", user.email.toLowerCase()),
        );
        const snap = await getDocs(q);
        const all = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());

        // Mark all rejected ones as "seen" with current timestamp if not already
        const rejectedIds = all.filter((r) => r.status === "rejected").map((r) => r.id);
        markAsSeen(rejectedIds);

        // Filter out rejected cards that were first seen more than 24hrs ago
        const visible = all.filter((r) => {
          if (r.status === "rejected") return !isExpired(r.id);
          return true;
        });

        setRequests(visible);
      } catch (err) {
        console.error("Error fetching requests:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [authLoading, isAuthenticated, user]);

  if (authLoading || loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <svg className="animate-spin h-7 w-7 text-gray-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );

  if (!isAuthenticated)
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-2">You're not logged in</h1>
          <button onClick={() => loginWithRedirect()}
            className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-800 transition">
            Log In
          </button>
        </div>
      </div>
    );

  const statusConfig = {
    pending:  { icon: Clock,        label: "Pending",  bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700" },
    approved: { icon: CheckCircle,  label: "Approved", bg: "bg-green-50 border-green-200",   text: "text-green-700" },
    rejected: { icon: XCircle,      label: "Rejected", bg: "bg-red-50 border-red-100",       text: "text-red-500"   },
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 sm:px-6 py-8 md:py-12 mt-[60px]">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
          <p className="text-sm text-neutral-400 mt-1">
            {requests.length} request{requests.length !== 1 ? "s" : ""} sent
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-16 text-gray-400 border border-gray-100 rounded-2xl">
            <Bell size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">You haven't contacted any sellers yet.</p>
            <button onClick={() => navigate("/browse")}
              className="mt-4 bg-black text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-800 transition">
              Browse Tickets
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((req) => {
              const { icon: Icon, label, bg, text } = statusConfig[req.status] || statusConfig.pending;
              const isApproved = req.status === "approved";
              const isRejected = req.status === "rejected";

              return (
                <div key={req.id}
                  className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">

                  {/* Ticket summary */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div  className="flex items-center gap-1.5  text-black">
                        <Train size={15} />
                      <p>{req.ticketName}</p>
                      </div>
                      
                      
                        
                        <span className="mb-1 text-xs text-gray-400">{req.trainNumber}</span>
                      
                      
                      <p className="text-xs text-gray-500 mt-0.5">
                        {req.from} → {req.to} · {req.journeyDate} · ₹{req.price}/seat
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
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <p className="text-xs  text-gray-400 uppercase tracking-wide mb-2">
                        Seller contact
                      </p>
                      <div className="flex flex-col gap-2">
                        <div  className="flex items-center gap-2.5 ">
                {req.sellerPhoto ? (
  <img
    src={req.sellerPhoto}
    alt={req.sellerName}
    className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0"
    referrerPolicy="no-referrer"
  />
) : (
  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
    {getInitials(req.sellerName)}
  </div>
)}

                          <p className="text-sm  text-gray-900">{req.sellerName}</p>
                        </div>
                        
                        
                        {/* Email */}
                        {req.sellerEmail && (
                          <a
                            href={`mailto:${req.sellerEmail}?subject=Re: ${req.ticketName} from ${req.from} to ${req.to}`}
                            className="flex items-center gap-2 bg-black text-white text-xs font-medium px-3 py-2.5 rounded-lg hover:bg-gray-800 transition"
                          >
                            <Mail size={13} />
                            {req.sellerEmail}
                          </a>
                        )}

                        {/* Phone — email + call buttons side by side */}
                        {req.sellerPhone && (
                          <div className="flex items-center gap-2">
                            <span className="flex-1 flex items-center gap-2 border border-gray-200 text-gray-700 text-xs font-medium px-3 py-2.5 rounded-lg">
                              <Phone size={13} className="text-gray-400 flex-shrink-0" />
                              {req.sellerPhone}
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
                    <p className="mt-2 text-xs text-gray-400">
                      The seller declined this request. This notice will disappear in 24 hours.
                    </p>
                  )}

                  {/* Pending message */}
                  {req.status === "pending" && (
                    <p className="mt-2 text-xs text-gray-400">
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
  );
};

export default MyRequestsPage;