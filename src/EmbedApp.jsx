// What loads inside a website's frame (/embed/...). Only the form: no sign-in check, splash screen, service worker or
// app chrome, so it appears at once on any website. See main.jsx.
import { BrowserRouter, Routes, Route } from "react-router-dom";
import EmbedInquiry from "@/pages/EmbedInquiry";

export default function EmbedApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/embed/inquiry/:slug" element={<EmbedInquiry />} />
        <Route path="*" element={null} />
      </Routes>
    </BrowserRouter>
  );
}
