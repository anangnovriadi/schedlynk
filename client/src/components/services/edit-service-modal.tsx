import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTeam } from "@/hooks/use-team";
import { apiRequest } from "@/lib/queryClient";
import { Clock, Users, Calendar, ExternalLink, Trash2 } from "lucide-react";

const editServiceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().min(1, "Description is required"),
  duration: z.number().min(5, "Duration must be at least 5 minutes"),
  isActive: z.boolean(),
  memberIds: z.array(z.number()).min(1, "At least one member must be selected"),
  workingHours: z.object({
    mon: z.object({ start: z.string(), end: z.string() }).optional(),
    tue: z.object({ start: z.string(), end: z.string() }).optional(),
    wed: z.object({ start: z.string(), end: z.string() }).optional(),
    thu: z.object({ start: z.string(), end: z.string() }).optional(),
    fri: z.object({ start: z.string(), end: z.string() }).optional(),
    sat: z.object({ start: z.string(), end: z.string() }).optional(),
    sun: z.object({ start: z.string(), end: z.string() }).optional(),
  }),
  cancellationBuffer: z.number().min(1, "Cancellation buffer must be at least 1 hour"),
  rescheduleBuffer: z.number().min(1, "Reschedule buffer must be at least 1 hour"),
});

type EditServiceForm = z.infer<typeof editServiceSchema>;

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

interface TeamMember {
  id: number;
  role: 'ADMIN' | 'MEMBER';
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface EditServiceModalProps {
  service: Service | null;
  isOpen: boolean;
  onClose: () => void;
}

const dayLabels = {
  mon: "Monday",
  tue: "Tuesday", 
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday"
};

const timeOptions = Array.from({ length: 24 * 2 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const time = `${hour.toString().padStart(2, '0')}:${minute}`;
  return time;
});

export default function EditServiceModal({ service, isOpen, onClose }: EditServiceModalProps) {
  const { currentTeam } = useTeam();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EditServiceForm>({
    resolver: zodResolver(editServiceSchema),
    defaultValues: {
      name: "",
      description: "",
      duration: 30,
      isActive: true,
      memberIds: [],
      workingHours: {
        mon: { start: "09:00", end: "17:00" },
        tue: { start: "09:00", end: "17:00" },
        wed: { start: "09:00", end: "17:00" },
        thu: { start: "09:00", end: "17:00" },
        fri: { start: "09:00", end: "17:00" },
      },
      cancellationBuffer: 24,
      rescheduleBuffer: 2,
    },
  });

  // Load service data when service changes
  useEffect(() => {
    if (service) {
      const workingHours = service.workingHours ? JSON.parse(service.workingHours) : {};
      form.reset({
        name: service.name,
        description: service.description,
        duration: service.duration,
        isActive: service.isActive,
        memberIds: service.members.map(m => m.user.id),
        workingHours,
        cancellationBuffer: service.cancellationBuffer,
        rescheduleBuffer: service.rescheduleBuffer,
      });
    }
  }, [service, form]);

  const { data: members = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/teams", currentTeam?.id, "members"],
    enabled: !!currentTeam && isOpen,
  });

  const updateServiceMutation = useMutation({
    mutationFn: async (data: EditServiceForm) => {
      const response = await apiRequest(
        "PUT",
        `/api/teams/${currentTeam!.id}/services/${service!.id}`,
        {
          ...data,
          workingHours: JSON.stringify(data.workingHours),
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", currentTeam?.id, "services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", currentTeam?.id, "stats"] });
      toast({
        title: "Service updated",
        description: "Your service has been updated successfully.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update service. Please try again.",
        variant: "destructive",
      });
      console.error("Update service error:", error);
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "DELETE",
        `/api/teams/${currentTeam!.id}/services/${service!.id}`
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", currentTeam?.id, "services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", currentTeam?.id, "stats"] });
      toast({
        title: "Service deleted",
        description: "The service has been deleted successfully.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete service. Please try again.",
        variant: "destructive",
      });
      console.error("Delete service error:", error);
    },
  });

  const onSubmit = (data: EditServiceForm) => {
    updateServiceMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      deleteServiceMutation.mutate();
    }
  };

  if (!service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="edit-service-description">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Edit Service: {service.name}</span>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`/book/${currentTeam?.slug}/${service.slug}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Public Page
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDelete}
                disabled={deleteServiceMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription id="edit-service-description">
            Modify service settings, update member assignments, and manage service availability.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Service Info Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Service Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <Badge variant={service.isActive ? "default" : "secondary"}>
                    {service.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Duration</span>
                  <span className="text-sm font-medium">{service.duration} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Members</span>
                  <span className="text-sm font-medium">{service.members.length}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Public URL:</span>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-xs font-mono break-all">
                    /book/{currentTeam?.slug}/{service.slug}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 30-min Consultation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                            <SelectItem value="90">90 minutes</SelectItem>
                            <SelectItem value="120">120 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of the service"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>Service Status</FormLabel>
                        <p className="text-sm text-gray-600">Enable or disable this service for bookings</p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cancellationBuffer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cancellation Buffer (hours)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <p className="text-xs text-gray-600">How far in advance bookings can be cancelled</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="rescheduleBuffer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reschedule Buffer (hours)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <p className="text-xs text-gray-600">How far in advance bookings can be rescheduled</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <FormField
                  control={form.control}
                  name="memberIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Team Members</FormLabel>
                      <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                        {members.map((member) => (
                          <div key={member.id} className="flex items-center space-x-3">
                            <Checkbox
                              checked={field.value.includes(member.user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, member.user.id]);
                                } else {
                                  field.onChange(field.value.filter(id => id !== member.user.id));
                                }
                              }}
                            />
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {member.user.name?.split(' ').map(n => n[0]).join('') || member.user.email[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <span className="text-sm text-gray-700">{member.user.name || member.user.email}</span>
                              <span className="text-xs text-gray-500 ml-1">({member.role})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <div>
                  <FormLabel className="text-base">Working Hours</FormLabel>
                  <p className="text-sm text-gray-600 mb-4">Set availability hours for each day of the week</p>
                  <div className="space-y-3">
                    {Object.entries(dayLabels).map(([day, label]) => (
                      <div key={day} className="flex items-center space-x-3">
                        <div className="w-20 text-sm font-medium">{label}</div>
                        <div className="flex items-center space-x-2">
                          <Select
                            value={form.watch(`workingHours.${day as keyof typeof dayLabels}.start`) || ""}
                            onValueChange={(value) => {
                              const current = form.getValues(`workingHours.${day as keyof typeof dayLabels}`) || {};
                              form.setValue(`workingHours.${day as keyof typeof dayLabels}`, {
                                ...current,
                                start: value
                              });
                            }}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="Start" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map((time) => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-sm text-gray-500">to</span>
                          <Select
                            value={form.watch(`workingHours.${day as keyof typeof dayLabels}.end`) || ""}
                            onValueChange={(value) => {
                              const current = form.getValues(`workingHours.${day as keyof typeof dayLabels}`) || {};
                              form.setValue(`workingHours.${day as keyof typeof dayLabels}`, {
                                ...current,
                                end: value
                              });
                            }}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="End" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map((time) => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              form.setValue(`workingHours.${day as keyof typeof dayLabels}`, undefined);
                            }}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex space-x-3 pt-6">
                  <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={updateServiceMutation.isPending}
                  >
                    {updateServiceMutation.isPending ? "Updating..." : "Update Service"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}