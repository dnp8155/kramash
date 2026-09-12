import React from "react";

export default function BrowserFrame({ url = "app.kramasha.com", children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-[#E5E5E5] bg-white shadow-2xl overflow-hidden ${className}`}>
      {/* Browser bar */}
      <div className="h-10 bg-[#F9F9F9] border-b border-[#E5E5E5] flex items-center px-4 gap-2 shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
        </div>
        <div className="ml-3 flex-1 max-w-xs h-6 rounded-md bg-white border border-[#E5E5E5] text-[10px] text-[#999] flex items-center px-2.5 truncate">
          {url}
        </div>
      </div>
      {/* Content */}
      <div className="flex min-h-[360px]">{children}</div>
    </div>
  );
}