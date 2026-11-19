import { useEffect } from "react";
import Landing from "@/pages/Landing";

// Short shareable link (kramasha.com/install): opens the landing page scrolled to the "Install" section,
// so it can be sent on WhatsApp / printed on a card. The section appears a moment after the page, so retry briefly.
export default function InstallRedirect() {
  useEffect(() => {
    let tries = 0;
    const id = setInterval(() => {
      const el = document.getElementById("install");
      tries += 1;
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); clearInterval(id); }
      else if (tries > 30) clearInterval(id);
    }, 200);
    return () => clearInterval(id);
  }, []);
  return <Landing />;
}
