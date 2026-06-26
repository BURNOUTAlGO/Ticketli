import React, { useEffect, useRef } from "react";

const cities = [
  {
    city: "Lucknow",
    state: "Uttar Pradesh",
    image:
      "https://i.pinimg.com/736x/e0/e5/f5/e0e5f5bc2a962e93cc998a5022c297ad.jpg",
  },
  {
    city: "New Delhi",
    state: "Delhi",
    image:
      "https://i.pinimg.com/1200x/4c/bb/49/4cbb49a90ec42829462bfe3212aed669.jpg",
  },
  {
    city: "Agra",
    state: "Uttar Pradesh",
    image:
      "https://i.pinimg.com/736x/02/47/53/024753f0272aae9f16b522b5aab342a9.jpg",
  },
  {
    city: "Mumbai",
    state: "Maharashtra",
    image:
      "https://i.pinimg.com/736x/fa/de/2b/fade2b3ef042004bd23961f65a00b2ed.jpg",
  },
  {
    city: "Jaipur",
    state: "Rajasthan",
    image:
      "https://i.pinimg.com/1200x/18/a4/c5/18a4c5c61c6a6635724128aded09f614.jpg",
  },
  {
    city: "Varanasi",
    state: "Uttar Pradesh",
    image:
      "https://i.pinimg.com/736x/d5/52/7c/d5527cb84cc7109e6964d63ff3c55263.jpg",
  },
  {
    city: "Chennai",
    state: "Tamil Nadu",
    image:
      "https://i.pinimg.com/736x/81/7c/49/817c49f38fe07e66f903e1cccfd343f6.jpg",
  },
  {
    city: "Kolkata",
    state: "West Bengal",
    image:
      "https://i.pinimg.com/736x/5c/81/c6/5c81c6e3b20c9eff49e620d374219aa7.jpg",
  },
];

const About = () => {
  const sectionRef = useRef(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          requestAnimationFrame(() => {
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          });
          observer.disconnect();
        }
      },
      {
        threshold: 0.01,
        rootMargin: "0px 0px -80px 0px",
      },
    );
    observer.observe(el);
  }, []);

  const loopCards = [...cities, ...cities];

  return (
    <>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        /* Marquee track: isolate it on its own GPU layer */
        .marquee-track {
          display: flex;
          gap: 1.25rem;
          width: max-content;
          /* Only animate transform — the single cheapest GPU operation */
          animation: marquee 38s linear infinite;
          will-change: transform;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track { animation: none; }
        }

        /* Card: contain painting to this element only */
        .city-card {
          position: relative;
          flex: none;
          width: 280px;
          height: 400px;
          overflow: hidden;
          background: #18181b;
          cursor: pointer;
          /* Promote to its own compositing layer so repaints don't bleed */
          isolation: isolate;
        }

        /* Image: use filter on a pseudo-layer isolated from the marquee */
        .city-card__img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          /* Start grayscale; transition only filter + transform */
          filter: grayscale(100%) contrast(1.05);
          transform: scale(1);
          transition:
            filter 500ms ease-out,
            transform 500ms ease-out;
          /* Hoist image to its own layer so filter changes don't repaint siblings */
          will-change: filter, transform;
        }
        .city-card:hover .city-card__img {
          filter: grayscale(0%) contrast(1);
          transform: scale(1.05);
        }

        /*
          Dark gradient scrim — use a pseudo-element so it never triggers
          a backdrop-filter repaint. No backdrop-blur at all.
        */
        .city-card__scrim {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            to bottom,
            rgba(0,0,0,0)    0%,
            rgba(0,0,0,0)    40%,
            rgba(0,0,0,0.15) 58%,
            rgba(0,0,0,0.55) 78%,
            rgba(0,0,0,0.82) 100%
          );
          opacity: 0;
          transition: opacity 500ms ease-out;
        }
        .city-card:hover .city-card__scrim {
          opacity: 1;
        }

        /* Label */
        .city-card__label {
          position: absolute;
          inset-inline: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 0 1rem 1.5rem;
          transform: translateY(0.625rem);
          opacity: 0;
          /* Explicit properties only — never transition-all */
          transition:
            transform 500ms ease-out,
            opacity   500ms ease-out;
        }
        .city-card:hover .city-card__label {
          transform: translateY(0);
          opacity: 1;
        }

        .city-card__name {
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.05em;
        }
        .city-card__state {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.6);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        /* Section fade-in */
        .about-section {
          width: 100%;
          padding: 5rem 0;
          overflow: hidden;
          opacity: 0;
          transform: translateY(1.5rem);
          /* Explicit — never transition-all on a section with child animations */
          transition:
            opacity  500ms ease-out,
            transform 500ms ease-out;
        }
      `}</style>

      <section id="places" ref={sectionRef} className="about-section">

        {/* Heading */}
        <div className="text-start max-w-[90%] mx-auto mb-12 md:text-center">
          <span className="text-[clamp(2.75rem,4.2vw,6.75rem)] font-sans leading-tight">
            Travel more. Plan less.
          </span>
          <span className="text-[clamp(2.75rem,4.2vw,6.75rem)] font-sans leading-tight bg-orange-500 text-white text-center rounded-[2px]">
            {" "}Explore freely !
          </span>
          <p className="mt-3 text-base text-gray-600 font-inter font-light dark:text-gray-400">
            Browse verified train tickets shared by fellow travelers and
            discover India's most iconic cities without the stress of sold-out
            bookings
          </p>
        </div>

        {/* Marquee outer — fades edges horizontally via mask */}
        <div
          style={{
            position: "relative",
            width: "100%",
            overflow: "hidden",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)",
            maskImage:
              "linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)",
          }}
        >
          <div className="marquee-track">
            {loopCards.map((c, i) => (
              <div key={`${c.city}-${i}`} className="city-card">
                <img
                  src={c.image}
                  alt={c.city}
                  loading="lazy"
                  decoding="async"
                  className="city-card__img"
                />
                <div className="city-card__scrim" aria-hidden="true" />
                <div className="city-card__label">
                  <span className="city-card__name">{c.city}</span>
                  <span className="city-card__state">{c.state}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>
    </>
  );
};

export default About;