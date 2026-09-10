import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";

export default function JobSheetEquipment({ items }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipment / Kit Checklist</CardTitle>
      </CardHeader>
      <CardBody>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm text-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border" />
              {item}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}