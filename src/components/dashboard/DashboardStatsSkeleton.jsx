import { SkStatGrid } from "@/components/common/Skeletons";

// Mirrors the Dashboard stat row: 2 columns on phones, 4 from md, each with a sub line.
export default function DashboardStatsSkeleton({ count = 4 }) {
  return <SkStatGrid count={count} sub className="grid-cols-2 md:grid-cols-4 sm:gap-4" />;
}
