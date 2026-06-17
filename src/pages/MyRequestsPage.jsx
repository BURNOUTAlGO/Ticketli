import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { db } from "../firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Bell, Train, CheckCircle, XCircle, Clock, Mail, Phone } from "lucide-react";

const MyRequestsPage = () => {
  const { user, isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user?.email) { setLoading(false); return; }

    const fetchRequests = async () => {
      try {
        const q = query(
          collection(db, "contactRequests"),
          where("buyerEmail", "==", user.email.toLowerCase()),
          orderBy("createdAt", "desc"),
        );
        const snap = await getDocs(q);
        setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
    pending:  { icon: Clock,       label: "Pending",  bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700" },
    approved: { icon: CheckCircle, label: "Approved", bg: "bg-green-50 border-green-200",   text: "text-green-700" },
    rejected: { icon: XCircle,     label: "Rejected", bg: "bg-red-50 border-red-100",       text: "text-red-500"   },
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

              return (
                <div key={req.id}
                  className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">

                  {/* Ticket summary */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                        <Train size={12} />
                        <span>{req.trainNumber}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{req.ticketName}</p>
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

                  {/* Seller contact — only shown when approved */}
                  {isApproved && (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Seller contact
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        {req.sellerEmail && (
                          <a href={`mailto:${req.sellerEmail}?subject=Re: ${req.ticketName} from ${req.from} to ${req.to}`}
                            className="flex items-center gap-2 bg-black text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-800 transition">
                            <Mail size={13} />
                            {req.sellerEmail}
                          </a>
                        )}
                        {req.sellerPhone && (
                          <a href={`tel:${req.sellerPhone}`}
                            className="flex items-center gap-2 border border-gray-200 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition">
                            <Phone size={13} />
                            {req.sellerPhone}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {req.status === "rejected" && (
                    <p className="mt-2 text-xs text-gray-400">
                      The seller declined this request. Try another listing.
                    </p>
                  )}

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