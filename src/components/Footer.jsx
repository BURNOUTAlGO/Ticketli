import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

// ── Theme tokens (consistent with the rest of the app) ──────────────────────
const FooterStyles = () => (
  <style>{`
    .footer-dark {
      --rail-orange: #FF6B1A;
      background: #0a0a0a;
      color: #f5f5f5;
    }
    .footer-link {
      color: #f5f5f5;
      transition: color 0.2s ease, opacity 0.2s ease;
    }
    .footer-link:hover {
      color: var(--rail-orange);
    }
    .footer-nav-link {
      color: #f5f5f5;
      transition: color 0.2s ease;
      line-height: 1.05;
    }
    .footer-nav-link:hover {
      color: var(--rail-orange);
    }
    .footer-wordmark-wrap {
      -webkit-mask-image: linear-gradient(to bottom, black 0%, black 55%, transparent 100%);
      mask-image: linear-gradient(to bottom, black 0%, black 55%, transparent 100%);
    }
    .footer-wordmark {
      background: linear-gradient(to bottom, #8a8a8a 0%, #4a4a4a 60%, #0a0a0a 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      line-height: 0.78;
      letter-spacing: -0.02em;
    }
  `}</style>
);

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/browse", label: "Browse" },
  { to: "/create-listing", label: "List" },
  { to: "/my-listings", label: "Dashboard" },
  { to: "/my-requests", label: "Requests" },
];

const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/maur_yaabhinav" },
  { label: "Facebook", href: "https://x.com" },
];

// Live clock for the timezone shown in the bottom bar. Defaults to India
// Standard Time since that's RailTicket's home market; adjust timeZone below
// if you'd like it to follow the visitor's locale instead.
const useLiveClock = (timeZone = "Asia/Kolkata") => {
  const [time, setTime] = useState("");

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone,
    });
    const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone,
    });

    const tick = () => {
      setTime(`${weekdayFormatter.format(new Date())} ${formatter.format(new Date())} IST`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeZone]);

  return time;
};

const Footer = () => {
  const clock = useLiveClock();

  return (
    <footer className="footer-dark relative  w-full overflow-hidden font-mono">
      <FooterStyles />

      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 pt-16 sm:pt-20 pb-10">
        {/* ── Top: 3-column grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Col 1 — statement + contact */}
          <div className="flex flex-col gap-8">
            <p className="font-sans font-bold text-2xl sm:text-[1.85rem] leading-tight tracking-tight max-w-sm">
              RailTicket connects travelers who can't make their journey with
              the people who need their seat.
            </p>

            <div className="flex flex-col  gap-3">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <ArrowDownRight size={15} style={{ color: "var(--rail-orange)" }} />
                <span>Contact</span>
              </div>
              <a
                href="mailto:support@railticket.app"
                className="footer-link text-sm w-fit"
              >
                thisisabhimaurya@gmail.com
              </a>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Built for Indian Railways travelers.
                <br />
                Operating nationwide, online only.
              </p>
            </div>
          </div>

          {/* Col 2 — navigation */}
          <div className="flex flex-col gap-4 md:justify-self-center">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Navigation
            </p>
            <nav className="flex flex-col ">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="footer-nav-link font-mono font-bold text-3xl sm:text-4xl py-1"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Col 3 — connect */}
          <div className="flex flex-col gap-4 md:justify-self-end">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Connect
            </p>
            <div className="flex flex-col gap-2">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="footer-link flex items-center gap-1.5 text-sm"
                >
                  {s.label}
                  <ArrowUpRight size={13} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Disclaimer ── */}
        <p className="text-xs text-neutral-500 leading-relaxed max-w-sm mt-20 sm:mt-28">
          RailTicket is an independent peer-to-peer listing platform and is
          not affiliated with, endorsed by, or operated by Indian Railways or
          IRCTC. Always verify ticket and ID details directly with your
          counterpart before traveling.
        </p>

        {/* ── Bottom bar ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-10 text-[11px] text-neutral-500 tracking-wide">
          <span>©{new Date().getFullYear()} TICKETLI</span>
          <Link to="/legal" className="footer-link hover:text-neutral-300">
            LEGAL NOTICE
          </Link>
          <span suppressHydrationWarning>{clock}</span>
        </div>
      </div>

      {/* ── Giant bleeding wordmark ── */}
      <div className="footer-wordmark-wrap w-full pointer-events-none select-none -mt-2 sm:-mt-4">
        <p
          className="footer-wordmark font-sans font-black uppercase whitespace-nowrap text-center"
          style={{ fontSize: "clamp(4rem, 17vw, 13rem)" }}
        >
          TICKETLI
        </p>
      </div>
    </footer>
  );
};

export default Footer;