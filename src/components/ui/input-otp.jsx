import * as React from "react"
import { OTPInput, OTPInputContext } from "input-otp"
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion"
import { Minus } from "lucide-react"

import { cn } from "@/lib/utils"

// One-time-code boxes: roomy rounded slots, digits that rise in and un-blur, a blinking caret, a short shake on a
// wrong code and a drawn check on success. Built on `input-otp`, so paste, SMS autofill and keyboard handling stay native.
// Looks like the app's own fields (rounded-xl, warm border, blue focus ring, white on the auth screens); moves like beui
// (digits rise and un-blur, blinking caret, shake on error, drawn check) plus the app's soft spring lift on the active box.
// `status`: undefined | "error" | "success". The shake replays every time status turns to "error".
// `variant`: "theme" (follows light/dark, e.g. Phone login) | "light" (the always-light auth look of Sign up).

const EASE_OUT = [0.16, 1, 0.3, 1]
const OTPStatusContext = React.createContext({ status: undefined, reduce: false, variant: "theme" })
const SPRING = { type: "spring", stiffness: 420, damping: 30 }

// Same colours as the inputs next to them: theme tokens, or the fixed auth palette (AUTH_INPUT in Onboarding/Register).
const SLOT_STYLES = {
  theme: {
    base: "bg-background border-input text-muted-foreground shadow-sm",
    filled: "border-foreground/25 text-foreground",
    active: "border-primary ring-2 ring-ring/25",
    caret: "bg-primary",
  },
  light: {
    base: "bg-white border-[#E5E3DF] text-[#B5B7BB] shadow-sm",
    filled: "border-[#CFCBC4] text-[#1A1D21]",
    active: "border-[#2D4899] ring-2 ring-[#2D4899]/20",
    caret: "bg-[#2D4899]",
  },
}

const InputOTP = React.forwardRef(({ className, containerClassName, status, variant = "theme", ...props }, ref) => {
  const reduce = !!useReducedMotion()
  const shake = useAnimationControls()
  const prev = React.useRef(status)

  React.useEffect(() => {
    if (status === "error" && prev.current !== "error" && !reduce) {
      shake.start({ x: [0, -5, 5, -4, 4, -2, 2, 0], transition: { duration: 0.45, ease: "easeOut" } })
    }
    prev.current = status
  }, [status, reduce, shake])

  return (
    <OTPStatusContext.Provider value={{ status, reduce, variant }}>
      <div className="flex items-center gap-3">
        <motion.div animate={shake}>
          <OTPInput
            ref={ref}
            containerClassName={cn("flex items-center gap-2 has-[:disabled]:opacity-50", containerClassName)}
            className={cn("disabled:cursor-not-allowed", className)}
            aria-invalid={status === "error" || undefined}
            {...props} />
        </motion.div>
        <AnimatePresence>
          {status === "success" && <SuccessCheck reduce={reduce} />}
        </AnimatePresence>
      </div>
    </OTPStatusContext.Provider>
  )
})
InputOTP.displayName = "InputOTP"

function SuccessCheck({ reduce }) {
  return (
    <motion.svg
      viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-emerald-500" fill="none" stroke="currentColor"
      strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 28 }}>
      <motion.path
        d="M5 12.5l4.5 4.5L19 7.5"
        initial={{ pathLength: reduce ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={reduce ? { duration: 0 } : { duration: 0.35, delay: 0.1, ease: EASE_OUT }} />
    </motion.svg>
  )
}

// Slots are spaced by the container gap; the group just keeps them on one row.
const InputOTPGroup = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center gap-2", className)} {...props} />
))
InputOTPGroup.displayName = "InputOTPGroup"

const InputOTPSlot = React.forwardRef(({ index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { status, reduce, variant } = React.useContext(OTPStatusContext)
  const look = SLOT_STYLES[variant] || SLOT_STYLES.theme
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index]

  const digitMotion = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 14, filter: "blur(4px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -14, filter: "blur(4px)" },
        transition: { duration: 0.22, ease: EASE_OUT },
      }

  return (
    <motion.div
      ref={ref}
      animate={{ y: isActive && !reduce ? -2 : 0, scale: isActive && !reduce ? 1.04 : 1 }}
      transition={SPRING}
      className={cn(
        "relative flex h-[52px] w-11 sm:h-14 sm:w-12 items-center justify-center rounded-xl border",
        "text-xl font-semibold tabular-nums transition-[border-color,box-shadow,color] duration-200 ease-out",
        look.base,
        char && look.filled,
        isActive && look.active,
        status === "error" && "border-destructive ring-2 ring-destructive/15",
        status === "success" && "border-emerald-500 ring-2 ring-emerald-500/15",
        className
      )}
      {...props}>
      {/* Digits are clipped inside their own layer so the focus ring outside the box is never cut off. */}
      <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
      <AnimatePresence initial={false}>
        {char && (
          <motion.span key={char} className="absolute inset-0 flex items-center justify-center" {...digitMotion}>
            {char}
          </motion.span>
        )}
      </AnimatePresence>
      </div>
      {(hasFakeCaret || (isActive && char)) && status !== "success" && (
        <div className={cn("pointer-events-none absolute inset-y-0 flex items-center", char ? "right-1.5" : "inset-x-0 justify-center")}>
          <motion.div
            className={cn("h-6 w-px rounded-full", look.caret)}
            animate={reduce ? { opacity: 1 } : { opacity: [1, 1, 0, 0] }}
            transition={reduce ? { duration: 0 } : { duration: 1, repeat: Infinity, ease: "linear", times: [0, 0.5, 0.5, 1] }} />
        </div>
      )}
    </motion.div>
  );
})
InputOTPSlot.displayName = "InputOTPSlot"

const InputOTPSeparator = React.forwardRef(({ ...props }, ref) => (
  <div ref={ref} role="separator" {...props}>
    <Minus />
  </div>
))
InputOTPSeparator.displayName = "InputOTPSeparator"

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
