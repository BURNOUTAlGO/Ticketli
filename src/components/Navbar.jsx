import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Menu, X, TramFront } from "lucide-react";
import { KineticText } from "@/components/ui/kinetic-text";

function Navbar() {
  const {
    isAuthenticated,
    loginWithRedirect: login,
    logout: auth0Logout,
    user,
  } = useAuth0();

  const [menuOpen, setMenuOpen] = useState(false);

  const logout = () =>
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });

  const navLinks = [
    { to: "/browse", label: "Browse Tickets" },
    { to: "/create-listing", label: "List a Ticket" },
    { to: "/my-listings", label: "My Listings" },
    { to: "/how-it-works", label: "How It Works" },
  ];

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b bg-white border-slate-200/70 shadow-sm backdrop-blur-sm">
        <div className="flex h-[60px] w-full items-center justify-between px-4 sm:px-6">



          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <TramFront />
            <KineticText
              text="TicketLi"
              className="text-[20px] font-semibold tracking-[-5%] leading-tight flex items-center justify-center text-center"
            />
          </Link>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8 text-[13px] text-slate-700">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="transition-colors duration-200 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <button
                  className="rounded-[8px] h-9 px-4 flex items-center justify-center bg-slate-950 text-sm text-white border border-gray-200 transition duration-200 hover:bg-white hover:text-black"
                  onClick={logout}
                >
                  Logout
                </button>
                <div className="bg-black h-9 w-9 rounded-full overflow-hidden flex-shrink-0">
                  <img src={user.picture} className="w-full h-full object-cover" alt={user.name || "User"} />
                </div>
              </>
            ) : (
              <button
                className="rounded-[8px] h-9 px-4 flex items-center justify-center bg-slate-950 text-sm text-white border border-gray-200 transition duration-200 hover:bg-white hover:text-black"
                onClick={login}
              >
                Login
              </button>
            )}
          </div>

          {/* Mobile: avatar + hamburger */}
          <div className="flex md:hidden items-center gap-3">
            {isAuthenticated && (
              <div className="bg-black h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
                <img src={user.picture} className="w-full h-full object-cover" alt={user.name || "User"} />
              </div>
            )}
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 -mr-2 text-slate-700 hover:text-slate-900 transition"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      {/* Backdrop */}
      <div
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm transition-opacity duration-300 md:hidden
          ${menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 left-0 z-[70] h-full w-[78vw] max-w-[320px] bg-white flex flex-col
          transition-transform duration-300 ease-in-out md:hidden
          ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex bg-black items-center justify-between px-5 h-[60px] border-b border-slate-100 flex-shrink-0 text-white">
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2"
          >
            <TramFront size={20} />
            <KineticText
              text="TicketLi"
              className="text-[20px] font-semibold tracking-[-5%] leading-tight flex items-center justify-center text-center"
            />
          </Link>
          <button
            onClick={() => setMenuOpen(false)}
            className="p-1.5 text-white hover:text-slate-900 transition"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col px-4 pt-6 gap-0.5 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="text-[15px] font-medium text-slate-700 px-3 py-3.5 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition border-b border-slate-100 last:border-b-0"
            >
              {link.label}
            </Link>
          ))}
                  {/* Auth buttons */}
        <div className="px-4 mt-[1rem] pb-8 pt-4 flex flex-col justify-center items-center gap-3 flex-shrink-0">
          {isAuthenticated ? (
            <button
              onClick={() => { setMenuOpen(false); logout(); }}
              className="w-full rounded-[9px] h-11 flex items-center justify-center bg-slate-950 text-sm font-semibold text-white transition duration-200 hover:bg-slate-800"
            >
              Logout
            </button>
          ) : (
            <>
              <button
                onClick={() => { setMenuOpen(false); login(); }}
                className="w-full rounded-[9px] h-11 flex items-center justify-center border border-slate-200 bg-white text-sm font-semibold text-slate-900 transition duration-200 hover:bg-slate-50"
              >
                Log In
              </button>
              <button
                onClick={() => { setMenuOpen(false); login({ authorizationParams: { screen_hint: "signup" } }); }}
                className="w-full rounded-[9px] h-11 flex items-center justify-center bg-slate-950 text-sm font-semibold text-white transition duration-200 hover:bg-slate-800"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
        </nav>


      </div>
    </>
  );
}

export default Navbar;