import { useState } from "react";
import { teamRoles, services } from "@/data/mockPreferences";
import { formatINR } from "@/utils/format";
import Toggle from "@/components/common/Toggle";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RateEstimator() {
  const [showPrices, setShowPrices] = useState(true);
  const [displayRate, setDisplayRate] = useState("");
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [markup, setMarkup] = useState(20);

  const toggleRole = (id) =>
    setSelectedRoles((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleService = (id) =>
    setSelectedServices((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const teamCost = teamRoles
    .filter((r) => selectedRoles.includes(r.id))
    .reduce((sum, r) => sum + r.price, 0);
  const servicesCost = services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0);
  const profit = Math.round((teamCost + servicesCost) * (markup / 100));
  const total = teamCost + servicesCost + profit;

  const reset = () => {
    setSelectedRoles([]);
    setSelectedServices([]);
    setMarkup(20);
    setDisplayRate("");
  };

  const Chip = ({ item, selected, onClick }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2.5 rounded-md border text-sm transition-colors",
        selected
          ? "border-primary bg-primary/5 text-foreground"
          : "border-border bg-card text-foreground hover:bg-muted/40"
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "w-4 h-4 rounded border flex items-center justify-center",
            selected ? "bg-primary border-primary" : "border-muted-foreground/40"
          )}
        >
          {selected && <Check className="w-3 h-3 text-primary-foreground" />}
        </span>
        {item.title}
      </span>
      {showPrices && <span className="text-muted-foreground">{formatINR(item.price)}</span>}
    </button>
  );

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1100px] mx-auto">
      <p className="text-sm text-muted-foreground">
        Tap roles and services to build a quick estimate. Rates come from your Preferences.
      </p>

      {/* Show prices toggle */}
      <div className="bg-card border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Show prices on chips</span>
          <Toggle checked={showPrices} onChange={setShowPrices} label="Show prices on chips" />
        </div>
        <Input
          placeholder="Display rate on each chip"
          value={displayRate}
          onChange={(e) => setDisplayRate(e.target.value)}
          className="sm:max-w-sm sm:ml-4"
        />
      </div>

      {/* Roles & services */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">Team Roles</h3>
          <div className="space-y-2">
            {teamRoles.map((r) => (
              <Chip key={r.id} item={r} selected={selectedRoles.includes(r.id)} onClick={() => toggleRole(r.id)} />
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">Services</h3>
          <div className="space-y-2">
            {services.map((s) => (
              <Chip key={s.id} item={s} selected={selectedServices.includes(s.id)} onClick={() => toggleService(s.id)} />
            ))}
          </div>
        </div>
      </div>

      {/* Profit margin */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">Profit Margin</h3>
        <input
          type="range"
          min="0"
          max="100"
          value={markup}
          onChange={(e) => setMarkup(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-sm text-muted-foreground mt-1">
          <span>Markup</span>
          <span className="font-medium text-foreground">{markup}%</span>
        </div>
      </div>

      {/* Estimate + reset */}
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <Button variant="destructive" onClick={reset}>
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
        <div className="bg-card border border-border rounded-lg p-4 flex-1 w-full">
          <div className="flex justify-between text-sm py-1">
            <span className="text-muted-foreground">Team Cost</span>
            <span className="font-medium">{formatINR(teamCost)}</span>
          </div>
          <div className="flex justify-between text-sm py-1">
            <span className="text-muted-foreground">Services Cost</span>
            <span className="font-medium">{formatINR(servicesCost)}</span>
          </div>
          <div className="flex justify-between text-sm py-1">
            <span className="text-muted-foreground">Profit ({markup}%)</span>
            <span className="font-medium">{formatINR(profit)}</span>
          </div>
          <div className="flex justify-between text-sm py-2 mt-2 border-t border-border">
            <span className="font-semibold">Total</span>
            <span className="font-bold">{formatINR(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}