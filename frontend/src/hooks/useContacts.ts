import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { contactService, type GetContactsParams } from '../services/contactService';
import type { ContactInput } from '../types/contact';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

export function useContacts(params: GetContactsParams) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['contacts', params],
    queryFn: () => contactService.getAll(params),
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: contactService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success("Contact created successfully");
    },
    onError: (error: AxiosError<{ message?: string; errors?: string }>) => {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      if (status === 400) {
        // Validation error - show detailed message
        const message = errorData?.errors || errorData?.message || "Validation error. Please check your input.";
        toast.error(message);
      } else if (status === 409) {
        toast.error(errorData?.message || "Email already exists");
      } else {
        toast.error(errorData?.message || "Failed to create contact");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContactInput }) =>
      contactService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success("Contact updated successfully");
    },
    onError: (error: AxiosError<{ message?: string; errors?: string }>) => {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      if (status === 400) {
        // Validation error - show detailed message
        const message = errorData?.errors || errorData?.message || "Validation error. Please check your input.";
        toast.error(message);
      } else if (status === 404) {
        toast.error("Contact not found");
      } else if (status === 409) {
        toast.error(errorData?.message || "Email already exists");
      } else {
        toast.error(errorData?.message || "Failed to update contact");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: contactService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success("Contact deleted successfully");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error?.response?.data?.message || "Failed to delete contact");
    },
  });

  return {
    ...query,
    createContact: createMutation,
    updateContact: updateMutation,
    deleteContact: deleteMutation,
  };
}
