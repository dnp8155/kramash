import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import { Phone } from "lucide-react";

export default function JobSheetContacts({ crew }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crew Contact Directory</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="space-y-2">
          {crew.map((c, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.role}</p>
              </div>
              {c.phone && (
                <a
                  href={`tel:${c.phone}`}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary"
                >
                  <Phone className="h-3.5 w-3.5" /> {c.phone}
                </a>
              )}
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}