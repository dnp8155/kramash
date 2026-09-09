import { useState } from "react";
import { Plus, Receipt, Loader2 } from "lucide-react";
import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function ExpenseCategoryManager({ className }) {
  const { categories, loading, createCategory, updateCategory } =
    useExpenseCategories();
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  const add = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await createCategory({ name: trimmed, status: "active" });
      setName("");
      toast({ title: "Category added" });
    } catch (e) {
      toast({ title: "Failed to add", description: e.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const toggle = async (c) => {
    await updateCategory(c.id, {
      status: c.status === "active" ? "inactive" : "active",
    });
  };

  return (
    <Card className={cn("lg:col-span-2", className)}>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          <CardTitle>Expense Categories</CardTitle>
        </div>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <div className="flex items-end gap-2">
          <Input
            label="New category"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Studio Rent"
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button onClick={add} disabled={adding || !name.trim()}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>
        {loading ? (
          <LoadingState label="Loading categories…" />
        ) : categories.length === 0 ? (
          <EmptyState
            title="No categories"
            description="Add categories like Travel, Hotel, or Equipment Rental."
            icon={Receipt}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5"
              >
                <span className="text-sm font-medium text-foreground">{c.name}</span>
                <StatusBadge status={c.status === "active" ? "Active" : "Inactive"} />
                <button
                  onClick={() => toggle(c)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                  title={c.status === "active" ? "Disable" : "Enable"}
                >
                  {c.status === "active" ? "Disable" : "Enable"}
                </button>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}