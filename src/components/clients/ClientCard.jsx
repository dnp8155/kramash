import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, ArrowRight } from "lucide-react";
import Card, { CardBody } from "@/components/common/Card";
import { initials } from "@/utils/format";

export default function ClientCard({ client }) {
  const location = [client.city, client.state].filter(Boolean).join(", ");
  return (
    <Link to={`/clients/${client.id}`} className="block h-full">
      <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
        <CardBody className="flex flex-1 flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials(client.name)}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-foreground">
                {client.name}
              </h3>
              <p className="truncate text-xs text-muted-foreground">
                {client.email || client.phone || "—"}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            {client.phone && (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> {client.phone}
              </p>
            )}
            {client.email && (
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> {client.email}
              </p>
            )}
            {location && (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {location}
              </p>
            )}
          </div>
          <div className="mt-auto flex items-center justify-end border-t border-border pt-3 text-sm font-medium text-primary">
            View Details <ArrowRight className="h-4 w-4" />
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}