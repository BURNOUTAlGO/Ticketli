import React from "react";
import {
  CheckIcon,
  RouteIcon,
  TicketIcon,
  UserIcon,
  ClipboardListIcon,
} from "lucide-react";

// The steps array defines the labels and icons for each step in the progress bar.
// This is the data used to render each step circle and text.
const steps = [
  { label: "Journey Details", Icon: RouteIcon },
  { label: "Ticket Details", Icon: TicketIcon },
  { label: "Contact Info", Icon: UserIcon },
  { label: "Review & Publish", Icon: ClipboardListIcon },
];

const ProgressBar = ({ step }) => {
  // step is the current active step number (1 through 4).
  return (
    <div className="w-full mb-8 md:mb-10">
      <div className="flex items-start">
        {steps.map(({ label, Icon }, index) => {
          const stepNum = index + 1;
          // isDone means the step is already completed.
          const isDone = step > stepNum;
          // isActive means this is the current step being shown.
          const isActive = step === stepNum;

          return (
            <div
              key={index}
              className="flex-1 gap-2 flex flex-col items-center"
            >
              {/* Circle row */}
              <div className="flex items-center gap-2 w-full">
                {/* Left line: shows a horizontal connector between previous step and current step. */}
                <div
                  className={`flex-1 h-px transition-colors duration-300
                    ${
                      index === 0
                        ? "invisible"
                        : step > index
                          ? "bg-black"
                          : "bg-gray-300"
                    }`}
                />

                {/* Circle: the step marker showing whether the step is completed, active, or pending. */}
                <div
                  className={`w-8 h-8 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300
                    ${
                      isDone
                        ? "bg-black border-black text-white"
                        : isActive
                          ? "border-black text-black bg-white"
                          : "border-gray-300 text-gray-400 bg-white"
                    }`}
                >
                  {isDone ? (
                    <CheckIcon
                      size={14}
                      strokeWidth={2.5}
                      className="md:hidden"
                    />
                  ) : (
                    <Icon size={14} strokeWidth={1.8} className="md:hidden" />
                  )}
                  {isDone ? (
                    <CheckIcon
                      size={20}
                      strokeWidth={2.5}
                      className="hidden md:block"
                    />
                  ) : (
                    <Icon
                      size={20}
                      strokeWidth={1.8}
                      className="hidden md:block"
                    />
                  )}
                </div>

                {/* Right line: shows a connector to the next step unless this is the last step. */}
                <div
                  className={`flex-1 h-px transition-colors duration-300
                    ${
                      index === steps.length - 1
                        ? "invisible"
                        : isDone
                          ? "bg-black"
                          : "bg-gray-300"
                    }`}
                />
              </div>

              {/* Label — hidden on mobile, visible md+ */}
              {/* On larger screens we show every step label under its circle. */}
              <p
                className={`hidden md:block mt-2.5 text-sm text-center whitespace-nowrap
                  ${isActive ? "font-semibold text-black" : "text-gray-400"}`}
              >
                {label}
              </p>

              {/* Label — mobile: only show active step label */}
              {/* On phones we only show the label for the current step to save space. */}
              {isActive && (
                <p className="md:hidden mt-1.5 text-xs font-semibold text-black text-center whitespace-nowrap">
                  {label}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;
