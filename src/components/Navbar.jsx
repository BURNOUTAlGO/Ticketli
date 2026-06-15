import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import {
  X,
  TramFront,
  Ticket,
  PlusSquare,
  List,
  HelpCircle,
  LogOut,
  LogIn,
  UserPlus,
  Search,
  AlignJustify,
  House,
} from "lucide-react";
import { KineticText } from "@/components/ui/kinetic-text";
import { ThemeToggle } from "../components/ThemeToggle";

function Navbar() {
  const {
    isAuthenticated,
    loginWithRedirect: login,
    logout: auth0Logout,
    user,
  } = useAuth0();

  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const location = useLocation();

  const logout = () =>
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });

  const navLinks = [
    { to: "/", label: "Home", icon: House },
    { to: "/browse", label: "Browse", icon: Ticket },
    { to: "/create-listing", label: "List", icon: PlusSquare },
    { to: "/my-listings", label: "My Listings", icon: List },
    { to: "/how-it-works", label: "How It Works", icon: HelpCircle },

  ];

  const filteredLinks = navLinks.filter((l) =>
    l.label.toLowerCase().includes(search.toLowerCase())
  );

  const closeDrawer = () => {
    setMenuOpen(false);
    setSearch("");
  };

  return (
    <>
      {/* ── Top Navbar ── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b dark:border-[var(--color-bg-secondary)] backdrop-blur-sm shadow-sm">
        <div className="flex h-[60px] font-inter w-full items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <TramFront />
            <KineticText
              text="TicketLi"
              className="text-[20px] font-figtree  tracking-[-5%] leading-tight flex items-center justify-center text-center"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8 text-[13px]">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="transition-colors duration-200 text-[var(--color-text)] hover:dark:text-[var(--color-text-hover)] rounded-2xl hover:dark:text-[var(--color-bg-secondary)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <button
                  className="rounded-[8px] h-9 px-4 flex items-center justify-center text-sm transition duration-200 bg-[var(--color-surface-hover)] dark:bg-[var(--color-bg-secondary)] hover:dark:bg-white hover:dark:text-black hover:bg-black hover:text-white"
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
                className="rounded-[8px] h-9 px-4 flex items-center justify-center text-sm transition duration-200 bg-[var(--color-surface-hover)] hover:dark:bg-white hover:dark:text-black hover:bg-black hover:text-white dark:bg-[var(--color-bg-secondary)]"
                onClick={login}
              >
                Login
              </button>
            )}
          </div>

          {/* Mobile: theme + avatar */}
          <div className="flex md:hidden items-center gap-3">
            <ThemeToggle />
            {isAuthenticated && (
              <div className="bg-black h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
                <img src={user.picture} className="w-full h-full object-cover" alt={user.name || "User"} />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile Bottom Pill ── */}
      <div className="fixed bottom-5 inset-x-0 z-50 md:hidden flex justify-center pointer-events-none">
        <div className="flex items-center pointer-events-auto overflow-hidden rounded-[10px] h-11 bg-neutral-900 border border-neutral-800 shadow-2xl">
          {/* Search trigger */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex items-center gap-2 px-4 h-full "
          >
            <Search size={15} className="text-neutral-400 flex-shrink-0" />
            <span className="text-[13px] text-neutral-400 ">Find...</span>
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-neutral-700 flex-shrink-0" />

          {/* Toggle button */}
          <button
            onClick={() => menuOpen ? closeDrawer() : setMenuOpen(true)}
            className="flex items-center justify-center w-11 h-full text-white  transition"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={15} /> : <AlignJustify size={15} />}
          </button>
        </div>
      </div>

      {/* ── Backdrop ── */}
      <div
        onClick={closeDrawer}
        className={`fixed inset-0 h-[100vh] z-[60] bg-black/70 backdrop-blur-sm transition-opacity duration-300 md:hidden
          ${menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* ── Centered floating modal drawer ── */}
      <div
        className={`fixed z-[70] md:hidden
          left-1/2 -translate-x-1/2
          w-[92vw] max-w-[420px]
          rounded-2xl flex flex-col overflow-hidden
          bg-neutral-900 
          h-[75vh]
          transition-all duration-300 ease-out
          ${menuOpen
            ? "bottom-[72px] opacity-100 translate-y-0"
            : "bottom-[56px] opacity-0 translate-y-4 pointer-events-none"
          }`}
      >
        {/* Header */}
        <div className="flex items-center  justify-between px-4 h-[52px] flex-shrink-0 border-b border-neutral-800">
          {isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
                <img src={user.picture} className="w-full h-full object-cover" alt={user.name || "User"} />
              </div>
              <span className="text-[13px] font-medium text-white truncate max-w-[180px]">
                {user.name || user.email}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
                <path d="M7 10l5 5 5-5" />
              </svg>
            </div>
          ) : (
            <Link to="/" onClick={closeDrawer} className="flex items-center gap-2">
              <TramFront size={18} className="text-white" />
              <KineticText
                text="TicketLi"
                className="text-[17px] font-figtree  tracking-[-5%] leading-tight text-white"
              />
            </Link>
          )}
          <button
            onClick={closeDrawer}
            className="p-1.5 text-neutral-600 hover:text-white transition rounded-lg hover:bg-white/10"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable nav with inner bottom fade */}
        <div className="relative min-h-0 overflow-y-auto flex-1 [scrollbar-width:thin] [scrollbar-color:#2a2a2a_transparent] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-neutral-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-neutral-600 [&::-webkit-scrollbar-button]:hidden">
          <nav className="flex flex-col px-2  py-2">
            {filteredLinks.length > 0 ? (
              filteredLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={closeDrawer}
                    className={`flex items-center  gap-3 px-3 py-[11px] rounded-xl transition-colors duration-150 group font-figtree 
                      ${isActive
                        ? "bg-white/10 text-white"
                        : "text-neutral-400 hover:bg-white/5 hover:text-white"
                      }`}
                  >
                    <Icon
                      size={17}
                      className={`flex-shrink-0 transition-colors duration-150 ${isActive ? "text-white" : "text-neutral-400 group-hover:text-neutral-300"}`}
                    />
                    <span className="text-[14px] font-medium">{link.label}</span>
                  </Link>
                );
              })
            ) : (
              <p className="text-neutral-600 text-[13px] px-3 py-4">
                No results for "{search}"
              </p>
            )}

            <div className="my-1.5 mx-1 border-t border-neutral-800" />

            {/* Auth rows */}
            {isAuthenticated ? (
              <button
                onClick={() => { closeDrawer(); logout(); }}
                className="flex items-center gap-3 px-3 py-[11px] rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-colors duration-150 group w-full text-left"
              >
                <LogOut size={17} className="text-neutral-600 group-hover:text-neutral-300 flex-shrink-0" />
                <span className="text-[14px] font-medium">Logout</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => { closeDrawer(); login(); }}
                  className="flex items-center gap-3 px-3 py-[11px] rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-colors duration-150 group w-full text-left"
                >
                  <LogIn size={17} className="text-neutral-600 group-hover:text-neutral-300 flex-shrink-0" />
                  <span className="text-[14px] font-medium">Log In</span>
                </button>
                <button
                  onClick={() => { closeDrawer(); login({ authorizationParams: { screen_hint: "signup" } }); }}
                  className="flex items-center gap-3 px-3 py-[11px] rounded-xl text-neutral-400 hover:bg-white/5 hover:text-white transition-colors duration-150 group w-full text-left"
                >
                  <UserPlus size={17} className="text-neutral-600 group-hover:text-neutral-300 flex-shrink-0" />
                  <span className="text-[14px] font-medium">Sign Up</span>
                </button>
              </>
            )}
          </nav>

          {/* Inner fade shadow at bottom of scroll area */}

        </div>

        {/* Bottom search bar */}
        <div className="px-3 pb-3 pt-2 flex-shrink-0 flex items-center gap-2 border-t border-neutral-800 bg-neutral-950">
          <div className="flex items-center  gap-2 flex-1  rounded-full px-4 h-10  border border-neutral-800">
            <Search size={14} className="text-neutral-500  flex-shrink-0" />
            <input
              type="text"
              placeholder="Find..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1  bg-transparent text-[13px] text-white placeholder-neutral-600 outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-neutral-500 hover:text-white transition"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Navbar;