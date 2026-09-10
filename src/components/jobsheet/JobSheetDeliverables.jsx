import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";

export default function JobSheetDeliverables({ deliverables }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deliverable Checklist</CardTitle>
      </CardHeader>
      <CardBody>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {deliverables.map((d, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm text-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border" />
              {d}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}