import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useTeam } from "@/hooks/use-team";
import { useDocumentTitle } from "@/hooks/use-document-title";
import ServiceCard from "@/components/services/service-card";
import CreateServiceModal from "@/components/services/create-service-modal";
import EditServiceModal from "@/components/services/edit-service-modal";
import { useState } from "react";

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

export default function Services() {
  const { currentTeam } = useTeam();
  const [isCreateServiceModalOpen, setIsCreateServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  useDocumentTitle("Services");

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/teams", currentTeam?.id, "services"],
    enabled: !!currentTeam,
  });

  const handleEditService = (service: Service) => {
    setEditingService(service);
  };

  if (!currentTeam) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Team Selected</h1>
          <p className="text-gray-600">Please select a team to view services.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Services</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">Manage your team's bookable services</p>
          </div>
          <Button onClick={() => setIsCreateServiceModalOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Create Service</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="flex justify-between mb-3">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-8 bg-gray-200 rounded flex-1"></div>
                  <div className="h-8 bg-gray-200 rounded flex-1"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="max-w-sm mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No services yet</h3>
              <p className="text-gray-600 mb-6">Get started by creating your first service</p>
              <Button onClick={() => setIsCreateServiceModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Service
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} onEdit={handleEditService} />
          ))}
          
          {/* Add Service Card */}
          <Button
            variant="outline"
            className="border-2 border-dashed border-gray-300 h-auto min-h-[180px] flex flex-col items-center justify-center text-gray-500 hover:text-gray-600 hover:border-gray-400"
            onClick={() => setIsCreateServiceModalOpen(true)}
          >
            <Plus className="h-8 w-8 mb-2" />
            <span className="text-sm font-medium">Add New Service</span>
          </Button>
        </div>
      )}

      <CreateServiceModal
        isOpen={isCreateServiceModalOpen}
        onClose={() => setIsCreateServiceModalOpen(false)}
      />

      <EditServiceModal
        service={editingService}
        isOpen={!!editingService}
        onClose={() => setEditingService(null)}
      />
    </div>
  );
}
