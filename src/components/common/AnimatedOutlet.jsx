import { AnimatePresence } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import PageTransition from "./PageTransition";

export default function AnimatedOutlet() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <PageTransition key={location.pathname}>
        <Outlet />
      </PageTransition>
    </AnimatePresence>
  );
}