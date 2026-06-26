import { useRef, useState, useCallback } from "react";
import train from "../assets/train.png";

import { useNavigate } from "react-router";

import { RainbowButton } from "@/components/ui/rainbow-button";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { cn } from "@/lib/utils";

import BlurText from "../components/BlurText";

const handleAnimationComplete = () => {
  console.log("Animation completed!");
};

<BlurText
  text="Isn't this so cool?!"
  delay={200}
  animateBy="words"
  direction="top"
  onAnimationComplete={handleAnimationComplete}
  className="text-2xl mb-8"
/>;

// ── 3D depth styles ─────────────────────────────────────────────────────────
// Pure CSS 3D (perspective + rotateX/Y + translateZ) — no extra dependencies.
const Scene3DStyles = () => (
  <style>{`
    .scene-3d {
      perspective: 1200px;
    }
    .tilt-3d {
      transform-style: preserve-3d;
      transition: transform 0.15s ease-out;
      will-change: transform;
    }
    .badge-3d {
      transform-style: preserve-3d;
      transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease;
    }
    .badge-3d:hover {
      transform: translateZ(14px) rotateX(6deg);
      box-shadow: 0 14px 24px -10px rgba(0, 0, 0, 0.25);
    }
    .cta-3d {
      transform-style: preserve-3d;
      transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .cta-3d:hover {
      transform: translateY(-4px) translateZ(20px) rotateX(8deg);
    }
    .cta-3d:active {
      transform: translateY(-1px) translateZ(8px) rotateX(2deg);
    }
    .headline-depth {
      text-shadow:
        0 1px 0 rgba(255, 107, 26, 0.10),
        0 3px 6px rgba(0, 0, 0, 0.06);
    }
    .train-layer {
      transform-style: preserve-3d;
      transition: transform 0.2s ease-out;
    }
    .train-track-glow {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40%;
      background: radial-gradient(ellipse 60% 100% at 50% 100%, rgba(255, 107, 26, 0.12), transparent 70%);
      pointer-events: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .tilt-3d, .badge-3d, .cta-3d, .train-layer {
        transition: none !important;
        transform: none !important;
      }
    }
  `}</style>
);

// Wraps children in a perspective container and tilts them toward the cursor.
const TiltScene = ({ children, className, maxTilt = 8 }) => {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width; // 0 → 1
      const py = (e.clientY - rect.top) / rect.height; // 0 → 1
      const rotateY = (px - 0.5) * maxTilt * 2;
      const rotateX = (0.5 - py) * maxTilt;
      setTilt({ x: rotateX, y: rotateY });
    },
    [maxTilt],
  );

  const handleMouseLeave = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("scene-3d", className)}
    >
      <div
        className="train-layer"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        {children}
      </div>
    </div>
  );
};

// Home page shows the main marketing screen for the app.
// It includes a headline, buttons to navigate to other pages, and a decorative train image.
function Home() {
  const navigate = useNavigate();
  return (
    <div
      id="home"
      className="relative  w-full flex justify-center items-center flex-col overflow-hidden"
    >
      <Scene3DStyles />

      <div
        className="flex flex-col mt-6 sm:mt-[20px] justify-evenly
       items-center w-[92vw] sm:w-[90vw] min-h-[80vh] py-8 sm:py-0"
      >
        {/* Hero section: contains the headline, description, and buttons. */}
        <div className="flex flex-col justify-center items-center h-full w-full sm:w-[90%] gap-6 sm:gap-[2rem]">
          <div className="flex scene-3d">
            <div
              className={cn(
                "badge-3d group rounded-full border border-black/5 bg-[#f9f9f9] text-[10px] h-[30px] text-white transition-all ease-in hover:cursor-pointer hover:bg-neutral-200 dark:border-white/5 dark:bg-neutral-900 dark:hover:bg-neutral-800 flex items-center justify-center",
              )}
            >
              <AnimatedShinyText className="inline-flex items-center justify-center px-3 sm:px-4 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400 whitespace-nowrap">
                <span>✨ Peer To Peer Train Ticket Sharing</span>
              </AnimatedShinyText>
            </div>
          </div>

          <div className="text-center flex flex-col justify-center items-center gap-3 px-2">
            <BlurText
              text="Need a Ticket? Have One to Sell"
              delay={200}
              animateBy="words"
              direction="top"
              onAnimationComplete={handleAnimationComplete}
              className="headline-depth text-[2.25rem] sm:text-[3.25rem] md:text-[4.5rem] tracking-[-5%] leading-tight flex items-center justify-center text-center"
            />
            <h1 className="text-[#969696] font-inter text-sm sm:text-base max-w-xl">
              List your train ticket and connect with travelers who need it.
              Simple, safe, and community-driven.
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-5 w-full sm:w-auto px-6 sm:px-0">
            <div className="scene-3d w-full sm:w-[150px]">
              <RainbowButton
                className="cta-3d w-full text-white dark:text-black sm:w-[150px]"
                onClick={() => navigate("/browse")}
              >
                Browse Tickets
              </RainbowButton>
            </div>
            <div className="scene-3d w-full sm:w-[150px]">
              <RainbowButton
                className="cta-3d w-full text-white dark:text-black sm:w-[150px]"
                onClick={() => navigate("/create-listing")}
              >
                List My Ticket
              </RainbowButton>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative train image at the bottom of the page — now with cursor-driven 3D depth. */}
      <TiltScene
        maxTilt={5}
        className="relative h-[170px] sm:h-[160px] md:h-[160px] w-full flex justify-end items-center overflow-hidden"
      >
        <div className="train-track-glow" />
        <img
          src={train}
          className="h-[600px] sm:h-[500px] md:h-auto w-auto sm:w-auto md:w-[80%] max-w-none object-contain animate-[moveTrain_6s_linear_infinite]"
          alt="Train"
          style={{ transform: "translateZ(30px)" }}
        />
      </TiltScene>
    </div>
  );
}

export default Home;
