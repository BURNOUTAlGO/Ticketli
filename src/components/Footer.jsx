import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const useDarkMode = () => {
  const getIsDark = () =>
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "dark";

  const [isDark, setIsDark] = useState(getIsDark);

  useEffect(() => {
    setIsDark(getIsDark());
    const observer = new MutationObserver(() => setIsDark(getIsDark()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return isDark;
};

const useLiveClock = (timeZone = "Asia/Kolkata") => {
  const [time, setTime] = useState("");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false, timeZone,
    });
    const wkFmt = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone });
    const tick = () => setTime(`${wkFmt.format(new Date())} · ${fmt.format(new Date())} IST`);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeZone]);
  return time;
};

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/browse", label: "Browse" },
  { to: "/create-listing", label: "List" },
  { to: "/my-listings", label: "Dashboard" },
  { to: "/my-requests", label: "Requests" },
];

const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/maur_yaabhinav" },
  { label: "Twitter / X", href: "https://x.com" },
];

const ArrowIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-50">
    <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Footer = () => {
  const isDark = useDarkMode();
  const clock = useLiveClock();

  return (
    <footer className={`relative overflow-hidden ${isDark ? "bg-white" : "bg-black"} text-white dark:text-black font-['Geist',sans-serif]`}>

      <div className="w-full h-[150px]"></div>

      {/* Fade from page bg into footer */}
      <div
        aria-hidden="true"
        className={`absolute top-0 left-0 right-0 h-66 pointer-events-none z-10 ${
          isDark
            ? "bg-gradient-to-b from-black via-amber-500 to-transparent"
            : "bg-gradient-to-b from-white  via-amber-500 to-transparent"
        }`}
      />


      {/* Main grid */}
      <div className="max-w-[1400px] mx-auto px-10 pt-16 pb-0 grid grid-cols-1 md:grid-cols-3 gap-12">

        {/* Col 1 — Tagline + Contact */}
        <div className="flex flex-col gap-10">
          <p className="text-[clamp(1.1rem,1.6vw,1.35rem)] font-medium leading-[1.45] tracking-[-0.01em] max-w-xs  m-0">
            RailTicket connects travelers who can't make their journey with the people who need their seat.
          </p>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] tracking-[0.1em] uppercase dark:text-gray-400 mb-2">
              Contact
            </span>
            <a
              href="mailto:thisisabhimaurya@gmail.com"
              className=" no-underline text-sm transition-colors duration-200 hover:text-[#FF6B1A] w-fit"
            >
              General Enquiries
            </a>
            <a
              href="mailto:thisisabhimaurya@gmail.com"
              className="text-white/40 dark:text-gray-400 no-underline text-[13px] w-fit"
            >
              thisisabhimaurya@gmail.com
            </a>
          </div>
        </div>

        {/* Col 2 — Navigation */}
        <div className="flex flex-col gap-4">
          <span className="text-[11px] tracking-[0.1em] uppercase text-white/40 dark:text-gray-400">
            Navigation
          </span>
          <nav className="flex flex-col gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className=" no-underline text-[clamp(1.6rem,2.5vw,2.2rem)] font-semibold tracking-[-0.02em] leading-[1.15] transition-colors duration-150 hover:text-[#FF6B1A] block"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Col 3 — Social + Legal */}
        <div className="flex flex-col gap-8">

          {/* Social */}
          <div className="flex flex-col gap-4">
            <span className="text-[11px] tracking-[0.1em] uppercase text-white/40 dark:text-gray-400">
              Social
            </span>
            <div className="flex flex-col gap-1">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className=" no-underline text-sm transition-colors duration-200 hover:text-[#FF6B1A] flex items-center gap-1 w-fit"
                >
                  {s.label}
                  <ArrowIcon />
                </a>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-3">
            <span className="text-[11px] tracking-[0.1em] uppercase text-white/40 dark:text-gray-400">
              Legal
            </span>
            <Link
              to="/legal"
              className=" no-underline text-sm transition-colors duration-200 hover:text-[#FF6B1A] w-fit"
            >
              Legal Notice
            </Link>
            <p className="text-xs text-white/40 dark:text-gray-400 m-0 leading-relaxed max-w-[260px]">
              Independent platform. Not affiliated with Indian Railways or IRCTC.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-[1400px] mx-auto mt-12 px-10 py-5 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-white/40 dark:text-gray-400 tracking-[0.04em]">
        <span>© {new Date().getFullYear()} TICKETLI</span>
        <span suppressHydrationWarning>{clock}</span>
      </div>

      {/* Giant wordmark */}
      <div
        className="w-full overflow-hidden pointer-events-none select-none -mt-2"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, black 0%, black 50%, transparent 100%)",
        }}
      >
        <p
          className="text-[clamp(4rem,17vw,13rem)] font-black tracking-[-0.03em] leading-[0.82] text-center m-0 uppercase whitespace-nowrap bg-clip-text text-transparent"
          style={{
            backgroundImage: isDark
              ? "linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.04) 60%, transparent 100%)"
              : "linear-gradient(to bottom, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 60%, transparent 100%)",
          }}
        >
          TICKETLI
        </p>
      </div>
    </footer>
  );
};

export default Footer;