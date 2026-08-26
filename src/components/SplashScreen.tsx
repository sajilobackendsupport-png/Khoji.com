import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Radio, Sparkles } from "lucide-react";

interface SplashScreenProps {
  appName?: string;
  tagline?: string;
  onFinish?: () => void;
  forceShow?: boolean;
}

const SPLASH_SESSION_KEY = "khoji_splash_shown";

export const SplashScreen: React.FC<SplashScreenProps> = ({
  appName = "KHOJI.COM",
  tagline = "Nepal Emergency & Device Tracking Network",
  onFinish,
  forceShow = false,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (forceShow) return true;
    const hasShown = sessionStorage.getItem(SPLASH_SESSION_KEY);
    return !hasShown;
  });

  useEffect(() => {
    if (!isVisible) {
      if (onFinish) onFinish();
      return;
    }

    // Mark as shown in this browser session
    sessionStorage.setItem(SPLASH_SESSION_KEY, "true");

    // Display splash for 1.8s then fade out
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onFinish) onFinish();
    }, 1800);

    return () => clearTimeout(timer);
  }, [isVisible, onFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="splash-screen-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white select-none overflow-hidden"
        >
          {/* Subtle Ambient Background Glow */}
          <div className="absolute w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none -top-12 -left-12 animate-pulse" />
          <div className="absolute w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none -bottom-12 -right-12 animate-pulse" />

          {/* Centered Brand Mark / Logo with 1.5s Smooth Scale & Fade-In */}
          <motion.div
            initial={{ opacity: 0, scale: 0.75, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 1.2,
              ease: [0.16, 1, 0.3, 1], // Custom bouncy easeOut
            }}
            className="flex flex-col items-center gap-6 relative z-10 px-6 text-center"
          >
            {/* Logo Emblem Disc */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-red-600 via-red-500 to-rose-600 flex items-center justify-center shadow-2xl shadow-red-500/30 border border-red-400/40 relative group">
                <Shield className="w-12 h-12 sm:w-14 sm:h-14 text-white drop-shadow-md" />

                {/* Pulsing Radar Ring */}
                <span className="absolute -inset-2 rounded-3xl border border-red-500/40 animate-ping pointer-events-none" />
                <span className="absolute -inset-4 rounded-3xl border border-red-500/20 pointer-events-none" />
              </div>

              {/* Status Badge */}
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 border-2 border-slate-950">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                <span>ONLINE</span>
              </div>
            </div>

            {/* Brand Title and Tagline */}
            <div className="space-y-2 max-w-sm">
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-2xl sm:text-3xl font-black tracking-wider bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent"
              >
                {appName}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed"
              >
                {tagline}
              </motion.p>
            </div>

            {/* Elegant Loading Progress Indicator */}
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 140 }}
              transition={{ delay: 0.4, duration: 1.0 }}
              className="h-1 bg-slate-800 rounded-full overflow-hidden relative mt-2"
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  repeat: Infinity,
                  duration: 1.2,
                  ease: "easeInOut",
                }}
                className="h-full w-1/2 bg-gradient-to-r from-red-500 to-blue-500 rounded-full"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex items-center gap-1 text-[10px] text-slate-500 font-mono tracking-widest uppercase"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Calibrating GPS & Dispatch Nodes</span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Higher-order animated container with staggered child reveals for the app's top navbar and content cards.
 */
export const StaggeredContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Top Navbar motion reveal (slides down gracefully)
 */
export const MotionNavbar: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => {
  return (
    <motion.header
      variants={{
        hidden: { opacity: 0, y: -24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.header>
  );
};

/**
 * Content Card motion reveal (slides up sequentially)
 */
export const MotionCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className = "", delay = 0 }) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1], delay },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default SplashScreen;
