import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, Users, Edit, Calendar, ExternalLink } from "lucide-react";
import { useTeam } from "@/hooks/use-team";
import { useLocation } from "wouter";

interface Service {
  id: number;
  name: string;
  slug: string;
  description: string;
  duration: number;
  isActive: boolean;
  workingHours: string;
  cancellationBuffer: number;
  rescheduleBuffer: number;
  members: Array<{
    id: number;
    order: number;
    user: {
      id: number;
      name: string;
      email: string;
    };
  }>;
}

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
}

export default function ServiceCard({ service, onEdit }: ServiceCardProps) {
  const { currentTeam } = useTeam();
  const [, setLocation] = useLocation();

  const openPublicPage = () => {
    window.open(`/book/${currentTeam?.slug}/${service.slug}`, '_blank');
  };

  const viewBookings = () => {
    setLocation(`/bookings?service=${service.id}`);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{service.name}</h4>
            <p className="text-sm text-gray-600 mt-1">{service.description}</p>
            <p className="text-xs text-gray-500 mt-1 font-mono">
              /book/{currentTeam?.slug}/{service.slug}
            </p>
          </div>
          <div className="ml-4">
            <Badge variant={service.isActive ? "default" : "secondary"}>
              {service.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <span className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            {service.duration} min
          </span>
          <span className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            {service.members.length} member{service.members.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center space-x-1 mb-4">
          <span className="text-xs text-gray-500">Round-robin:</span>
          <div className="flex space-x-1">
            {service.members
              .sort((a, b) => a.order - b.order)
              .slice(0, 4)
              .map((member) => (
                <Avatar key={member.id} className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {member.user.name?.split(' ').map(n => n[0]).join('') || member.user.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            {service.members.length > 4 && (
              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xs text-gray-600">+{service.members.length - 4}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => onEdit(service)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={openPublicPage}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs"
            onClick={viewBookings}
          >
            <Calendar className="h-3 w-3 mr-1" />
            View Bookings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
