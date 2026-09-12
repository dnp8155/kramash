import React from "react";

export default function BrowserFrame({ url = "app.kramashah.com", children, className = "" }) {
  return (
    <div className={`rounded-xl border border-[#E8E3DB] bg-white shadow-2xl overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#E8E3DB] bg-[#F5F3EF]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#E84A3F]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#E8A93F]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#3FC85E]" />
        </div>
        <div className="flex-1 mx-3 h-6 rounded-md bg-white border border-[#E8E3DB] flex items-center px-2.5">
          <span className="text-[10px] text-[#8A8580] font-mono">{url}</span>
        </div>
      </div>
      <div className="flex min-h-[420px]">{children}</div>
    </div>
  );
}