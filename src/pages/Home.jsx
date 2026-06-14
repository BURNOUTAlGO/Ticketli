import train from "../assets/train.png";

import { useNavigate } from "react-router";

import { RainbowButton } from "@/components/ui/rainbow-button";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { cn } from "@/lib/utils";
import { KineticText } from "@/components/ui/kinetic-text";

// Home page shows the main marketing screen for the app.
// It includes a headline, buttons to navigate to other pages, and a decorative train image.
function Home() {
  const navigate = useNavigate();
  return (
    <div className="relative w-full flex justify-center items-center flex-col overflow-hidden">

      <div
        className="flex flex-col mt-6 sm:mt-[20px] justify-evenly
       items-center w-[92vw] sm:w-[90vw] min-h-[80vh] py-8 sm:py-0"
      >
        {/* Hero section: contains the headline, description, and buttons. */}
        <div className="flex flex-col justify-center items-center h-full w-full sm:w-[90%] gap-6 sm:gap-[2rem]">
          <div className="flex">
            <div
              className={cn(
                "group rounded-full border border-black/5 bg-[#F2F2F2] text-[10px] h-[25px] text-white transition-all ease-in hover:cursor-pointer hover:bg-neutral-200 dark:border-white/5 dark:bg-neutral-900 dark:hover:bg-neutral-800 flex items-center justify-center",
              )}
            >
              <AnimatedShinyText className="inline-flex items-center justify-center px-3 sm:px-4 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400 whitespace-nowrap">
                <span>✨ Peer To Peer Train Ticket Sharing</span>
              </AnimatedShinyText>
            </div>
          </div>

          <div className="text-center flex flex-col justify-center items-center gap-3 px-2">
            <KineticText
              text="Wanna Sell Tickets? Or Buy Tickets?"
              className="text-[2.25rem] sm:text-[3.25rem] md:text-[4.5rem] tracking-[-5%] leading-tight flex items-center justify-center text-center"
            />
            <h1 className="text-[#969696] text-sm sm:text-base max-w-xl">
              Can't make your journey? List your train ticket and connect with
              travelers who need it. Simple, safe, and community-driven.
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-5 w-full sm:w-auto px-6 sm:px-0">
            <RainbowButton className="w-full sm:w-[150px]" onClick={() => navigate("/browse")}>
              Browse Tickets
            </RainbowButton>
            <RainbowButton variant="outline" className="w-full sm:w-[150px]" onClick={() => navigate("/create-listing")}>
              List My Ticket
            </RainbowButton>
          </div>
        </div>
      </div>

      {/* Decorative train image at the bottom of the page. */}
      <div className="h-[80px] sm:h-[120px]  md:h-[160px] w-full flex justify-end items-center overflow-hidden">
        <img
          src={train}
          className="w-[120%] md:w-[80%] object-cover animate-[moveTrain_6s_linear_infinite]"
          alt="Train"
        />
      </div>
    </div>
  );
}

export default Home;