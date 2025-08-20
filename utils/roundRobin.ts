import { IStorage } from '../server/storage';

/**
 * Get the next assignee for a service using round-robin assignment
 */
export async function nextAssignee(storage: IStorage, serviceId: number): Promise<number> {
  const serviceMembers = await storage.getServiceMembers(serviceId);
  
  if (serviceMembers.length === 0) {
    throw new Error('No service members available for assignment');
  }
  
  // Sort by order to ensure consistent round-robin
  const sortedMembers = serviceMembers.sort((a, b) => a.order - b.order);
  
  // For now, return the first member as a simple assignment
  // In a production system, this would track the last assigned member
  // and rotate through the list
  return sortedMembers[0].userId;
}