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
            el.classList.remove("opacity-0", "translate-y-6");
            el.classList.add("opacity-100", "translate-y-0");
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
      {/* One keyframe — the only thing that genuinely requires tailwind.config.js to avoid */}
      <style>{`@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>

      <section
        id="places"
        ref={sectionRef}
        className="w-full py-20 overflow-hidden opacity-0
translate-y-6
transform-gpu
will-change-transform
will-change-opacity
transition-all
duration-500
ease-out "
      >
        {/* Heading */}
        <div className="text-start max-w-[90%]  mx-auto mb-12 md:text-center">
          <span className="text-[clamp(2.75rem,4.2vw,6.75rem)] font-sans leading-tight">
            Travel more. Plan less.
          </span>
          <span className="text-[clamp(2.75rem,4.2vw,6.75rem)] font-sans leading-tight bg-orange-500 text-white text-center rounded-[2px]">
            {" "}
            Explore freely !
          </span>

          <p className="mt-3 text-base text-gray-600 font-inter font-light dark:text-gray-400">
            Browse verified train tickets shared by fellow travelers and
            discover India's most iconic cities without the stress of sold-out
            bookings
          </p>
        </div>

        {/* Marquee outer — fades edges horizontally */}
        <div
          className="relative w-full overflow-hidden
            [mask-image:linear-gradient(to_right,transparent_0%,black_7%,black_93%,transparent_100%)]
            [-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_7%,black_93%,transparent_100%)]"
        >
          {/* Marquee track — animation name defined in the keyframe above */}
          <div
            className="flex gap-5 w-max hover:[animation-play-state:paused] motion-reduce:animate-none"
            style={{ animation: "marquee 38s linear infinite" }}
          >
            {loopCards.map((c, i) => (
              <div
                key={`${c.city}-${i}`}
                className="group relative flex-none w-[280px] h-[400px] overflow-hidden bg-zinc-900 cursor-pointer"
              >
                {/* Photo */}
                <img
                  src={c.image}
                  alt={c.city}
                  loading="lazy"
                
                  className="w-full h-full object-cover grayscale contrast-105 scale-100 transition-all duration-500 ease-out group-hover:grayscale-0 group-hover:contrast-100 group-hover:scale-105"
                />

                {/* Feathered backdrop-blur — masked to lower portion only */}
                <div
                  className="absolute inset-0 pointer-events-none backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500
                    [mask-image:linear-gradient(to_bottom,transparent_0%,transparent_42%,black_72%,black_100%)]
                    [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,transparent_52%,black_72%,black_100%)]"
                />

                {/* Dark gradient scrim */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500
                    bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_0%,rgba(0,0,0,0)_40%,rgba(0,0,0,0.15)_58%,rgba(0,0,0,0.55)_78%,rgba(0,0,0,0.82)_100%)]"
                />

                {/* City + state label */}
                <div
                  className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 px-4 pb-6
                    translate-y-2.5 opacity-0 group-hover:translate-y-0 group-hover:opacity-100
                    transition-[transform,opacity] duration-500"
                >
                  <span className="text-base font-bold text-white tracking-wide">
                    {c.city}
                  </span>
                  <span className="text-xs text-white/60 uppercase tracking-widest">
                    {c.state}
                  </span>
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
