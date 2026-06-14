import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Menu, X } from "lucide-react";

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
    { to: "/", label: "Home" },
    { to: "/browse", label: "Browse" },
    { to: "/create-listing", label: "Create" },
    { to: "/my-listings", label: "My Listings" },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b bg-white border-slate-200/70 shadow-sm backdrop-blur-sm">
      <div className="flex h-[60px] w-full items-center justify-between px-4 sm:px-6">



        {/* Desktop nav */}
        <nav className="hidden md:flex items-center  gap-8 text-[13px] text-slate-700">
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
                {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
  
          <span className="text-sm sm:text-[16px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.28em] text-slate-900">
            Ticketli
          </span>
        </Link>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <button
                className="rounded-full h-9 px-4 flex items-center justify-center bg-slate-950 text-sm text-white border border-slate-950 transition duration-200 hover:bg-white hover:text-black"
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
              className="rounded-full h-9 px-5 flex items-center justify-center border border-slate-300 bg-white text-sm text-black transition duration-200 hover:bg-black hover:text-white"
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
            onClick={() => setMenuOpen((prev) => !prev)}
            className="p-2 -mr-2 text-slate-700 hover:text-slate-900 transition"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-slate-100
          ${menuOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0 border-t-0"}`}
      >
        <nav className="flex flex-col px-4 py-3 gap-1 bg-white">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="text-sm font-medium text-slate-700 px-2 py-2.5 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition"
            >
              {link.label}
            </Link>
          ))}

          <div className="border-t border-slate-100 mt-2 pt-3">
            {isAuthenticated ? (
              <button
                className="w-full rounded-xl h-10 flex items-center justify-center bg-slate-950 text-sm text-white transition duration-200 hover:bg-slate-800"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
              >
                Logout
              </button>
            ) : (
              <button
                className="w-full rounded-xl h-10 flex items-center justify-center border border-slate-300 bg-white text-sm text-black transition duration-200 hover:bg-black hover:text-white"
                onClick={() => {
                  setMenuOpen(false);
                  login();
                }}
              >
                Login
              </button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;