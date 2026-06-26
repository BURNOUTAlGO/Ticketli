import React, { useRef, useEffect, useState } from "react";

const testimonials = [
  {
    name: "Priya Mehta",
    role: "Frequent Commuter, Mumbai",
    avatar: "https://i.pravatar.cc/80?img=47",
    quote:
      "My PNR was waitlisted two days before travel. Found a confirmed ticket on TicketLi within minutes and made my trip.",
    rating: 4.9,
  },
  {
    name: "Arjun Sharma",
    role: "Business Traveler",
    avatar: "https://i.pravatar.cc/80?img=59",
    quote:
      "Plans changed and I couldn't get a refund in time. Listed my ticket on TicketLi and it sold before the journey date.",
    rating: 4.9,
  },
  {
    name: "Liam Torres",
    role: "Backpacker",
    avatar: "https://i.pravatar.cc/80?img=11",
    quote:
      "Verifying the PNR before buying gave me real peace of mind. Knew exactly what I was getting before I paid.",
    rating: 4.9,
  },
  {
    name: "Sneha Rao",
    role: "Weekend Traveler",
    avatar: "https://i.pravatar.cc/80?img=44",
    quote:
      "Listing took less than two minutes — PNR in, details auto-filled, and a buyer reached out the same day.",
    rating: 4.9,
  },
  {
    name: "Rahul Nair",
    role: "Frequent Flyer, Bengaluru",
    avatar: "https://i.pravatar.cc/80?img=52",
    quote:
      "No more wasted tickets when plans fall through. TicketLi turned a sunk cost into a quick recovery.",
    rating: 4.9,
  },
  {
    name: "Divya Menon",
    role: "Student Traveler",
    avatar: "https://i.pravatar.cc/80?img=25",
    quote:
      "Found a confirmed Sleeper ticket for a route that was sold out everywhere else. Saved my festival trip home.",
    rating: 4.9,
  },
  {
    name: "Michael Grant",
    role: "Frequent Commuter",
    avatar: "https://i.pravatar.cc/80?img=33",
    quote:
      "The contact-request flow feels safe — no random calls, no spam. Just a clean way to reach the seller.",
    rating: 4.9,
  },
  {
    name: "Emma Rodriguez",
    role: "Business Traveler",
    avatar: "https://i.pravatar.cc/80?img=23",
    quote:
      "Sold a ticket I couldn't use and got my money back the same evening. Wish I'd known about this sooner.",
    rating: 4.9,
  },
];

// ── Shared theme tokens (same orange/black system as the rest of the app) ──
const ThemeStyles = () => (
  <style>{`
    
    .ticketli-testimonials {
      --rail-orange: #FF6B1A;
      --rail-orange-dim: #FF6B1A1a;
      --rail-orange-mid: #FF6B1A40;
      --font-heading: 'Manrope', 'Geist', sans-serif;
      --font-body: 'Inter', 'Geist', sans-serif;
      font-family: var(--font-body);
    }
    .ticketli-testimonials h2 {
      font-family: var(--font-heading);
    }
  `}</style>
);

const Card = ({ t }) => (
  <div
    className="
    rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col justify-between gap-2.5 sm:gap-4 w-full flex-shrink-0
    bg-gray-100 dark:bg-[#1a1a1a]
    border border-gray-200 dark:border-white/[0.06]
  "
  >
    {/* Rating — tabular mono "readout" */}
    <div className="flex items-center gap-1 sm:gap-1.5">
      <span className="font-mono text-xs sm:text-sm font-semibold tabular-nums text-gray-800 dark:text-gray-200">
        {t.rating.toFixed(1)}
      </span>
      <span
        style={{ color: "var(--rail-orange)" }}
        className="text-xs sm:text-sm leading-none"
      >
        ★
      </span>
      <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 font-mono uppercase tracking-wide">
        Rating
      </span>
    </div>

    <p className="text-gray-900 dark:text-gray-100 text-[11.5px] sm:text-[14px] leading-relaxed font-medium flex-1">
      "{t.quote}"
    </p>

    <div className="flex items-center gap-2 sm:gap-2.5 border-t border-gray-200 dark:border-white/[0.08] pt-2.5 sm:pt-3">
      <img
        src={t.avatar}
        alt={t.name}
        className="w-7 h-7 sm:w-9 sm:h-9 rounded-full object-cover flex-shrink-0"
      />
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
          {t.name}
        </p>
        <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 font-mono truncate">
          {t.role}
        </p>
      </div>
    </div>
  </div>
);

const MarqueeColumn = ({ items, direction = "down", speed = 0.4 }) => {
  const trackRef = useRef(null);
  const posRef = useRef(null);
  const rafRef = useRef(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    posRef.current = null;
  }, [items]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    if (posRef.current === null) {
      posRef.current = direction === "down" ? -(track.scrollHeight / 2) : 0;
      track.style.transform = `translateY(${posRef.current}px)`;
    }

    const animate = () => {
      if (!paused) {
        posRef.current += direction === "down" ? speed : -speed;
        const halfH = track.scrollHeight / 2;
        if (direction === "down" && posRef.current >= 0)
          posRef.current = -halfH;
        if (direction === "up" && posRef.current <= -halfH) posRef.current = 0;
        track.style.transform = `translateY(${posRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paused, direction, speed, items]);

  const doubled = [...items, ...items];

  return (
    <div
      className="relative overflow-hidden flex-1 w-full"
      style={{ height: "clamp(300px, 65vh, 600px)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Top fade */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-10 sm:h-16 z-10 bg-gradient-to-b from-white dark:from-black to-transparent" />
      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 sm:h-16 z-10 bg-gradient-to-t from-white dark:from-black to-transparent" />

      <div ref={trackRef} className="flex flex-col gap-2 sm:gap-3 w-full">
        {doubled.map((t, i) => (
          <Card key={i} t={t} />
        ))}
      </div>
    </div>
  );
};

const logos = ["IRCTC Network", "Indian Railways", "PNR Verified"];

const Testimonial = () => {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const col1 = testimonials.slice(0, 4);
  const col2 = testimonials.slice(4);

  return (
    <section
      id="testimonial"
      ref={sectionRef}
      className="ticketli-testimonials w-full bg-white dark:bg-black py-14 sm:py-20 lg:py-24 overflow-hidden"
    >
      <ThemeStyles />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-3 flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
        {/* Left — text panel */}
        <div
          className={`w-full lg:w-[320px] xl:w-[360px] flex-shrink-0 lg:sticky lg:top-0 text-left  transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span
            className="inline-flex items-center justify-start gap-1.5 border rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-wider mb-5"
            style={{
              borderColor: "var(--rail-orange-mid)",
              color: "var(--rail-orange)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--rail-orange)" }}
            />
            Testimonials
          </span>

          <h2 className="text-[clamp(2.75rem,4.2vw,6.75rem)] leading-[1.12] tracking-tight text-gray-900 dark:text-white mb-4">
            Trusted by travelers
            <br className="hidden lg:block" /> across India
          </h2>

          <p className="text-[15px] text-gray-600 font-inter dark:text-gray-400 leading-relaxed mb-7 max-w-sm">
            Real stories from buyers and sellers who turned a stuck PNR or a
            sold-out route into a smooth journey with TicketLi.
          </p>

          {/* Logos */}
          <div className="mt-2 pt-6 border-t border-gray-100 dark:border-white/[0.08]">
            <p className="text-xs text-gray-400 dark:text-gray-600 font-mono uppercase tracking-wider mb-3">
              Built for Indian Railways travelers
            </p>
            <div className="flex items-center justify-start gap-x-4 gap-y-2 flex-wrap">
              {logos.map((l, i) => (
                <span
                  key={i}
                  className="text-xs font-mono font-medium text-gray-500 dark:text-gray-500 tracking-tight"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right — marquee: two columns at all sizes, scaled down on mobile */}
        <div
          className={`w-full flex-1 flex flex-row gap-2 sm:gap-4 transition-all duration-700 delay-150 ease-out ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <MarqueeColumn items={col1} direction="down" speed={0.3} />
          <MarqueeColumn items={col2} direction="up" speed={0.3} />
        </div>
      </div>
    </section>
  );
};

export default Testimonial;
