import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useTeam } from "@/hooks/use-team";
import { apiRequest } from "@/lib/queryClient";

const createServiceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().min(1, "Description is required"),
  duration: z.number().min(5, "Duration must be at least 5 minutes"),
  memberIds: z.array(z.number()).min(1, "At least one member must be selected"),
});

type CreateServiceForm = z.infer<typeof createServiceSchema>;

interface TeamMember {
  id: number;
  role: 'ADMIN' | 'MEMBER';
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface CreateServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateServiceModal({ isOpen, onClose }: CreateServiceModalProps) {
  const { currentTeam } = useTeam();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateServiceForm>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: {
      name: "",
      description: "",
      duration: 30,
      memberIds: [],
    },
  });

  const { data: members = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/teams", currentTeam?.id, "members"],
    enabled: !!currentTeam && isOpen,
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data: CreateServiceForm) => {
      const response = await apiRequest(
        "POST",
        `/api/teams/${currentTeam!.id}/services`,
        data
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create service');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", currentTeam?.id, "services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", currentTeam?.id, "stats"] });
      toast({
        title: "Service Created Successfully!",
        description: "Your new service is now available for booking.",
      });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      const getErrorMessage = (message: string) => {
        if (message.includes('Service name already exists')) {
          return "A service with this name already exists in your team. Please choose a different name.";
        }
        if (message.includes('Database temporarily unavailable')) {
          return "Database is temporarily unavailable. Please try again in a moment.";
        }
        if (message.includes('Name and description are required')) {
          return "Please fill in both the service name and description.";
        }
        if (message.includes('Service name too short')) {
          return "Service name must be at least 2 characters long.";
        }
        if (message.includes('Description too short')) {
          return "Service description must be at least 5 characters long.";
        }
        if (message.includes('Invalid duration')) {
          return "Duration must be between 5 minutes and 8 hours.";
        }
        if (message.includes('network') || message.includes('fetch')) {
          return "Unable to connect to the server. Please check your connection and try again.";
        }
        return message || "An unexpected error occurred while creating the service. Please try again.";
      };

      toast({
        title: "Failed to Create Service",
        description: getErrorMessage(error.message),
        variant: "destructive",
      });
      console.error("Create service error:", error);
    },
  });

  const onSubmit = (data: CreateServiceForm) => {
    createServiceMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" aria-describedby="create-service-description">
        <DialogHeader>
          <DialogTitle>Create New Service</DialogTitle>
          <DialogDescription id="create-service-description">
            Create a new service that team members can provide to customers.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            
            <FormField
              control={form.control}
              name="memberIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Team Members</FormLabel>
                  <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-3">
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
            
            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={createServiceMutation.isPending}
              >
                {createServiceMutation.isPending ? "Creating..." : "Create Service"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
