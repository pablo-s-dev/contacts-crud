import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Contact, ContactInput } from "../../types/contact";
import { useEffect } from "react";
import { isValidPhoneNumber } from "libphonenumber-js";

const formSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(50, "Name must be at most 50 characters long"),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .refine(
      (val) => isValidPhoneNumber(val),
      "Invalid phone number (e.g. +55 11 90000-0000)"
    ),
});

interface ContactFormProps {
  initialData?: Contact;
  onSubmit: (data: ContactInput) => void;
  isSubmitting?: boolean;
  onCancel: () => void;
}

export function ContactForm({
  initialData,
  onSubmit,
  isSubmitting,
  onCancel,
}: ContactFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        email: initialData.email,
        phone: initialData.phone,
      });
    }
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="john@example.com" {...field} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="+55 11 90000-0000" {...field} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="cancel-button"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            data-testid="submit-button"
          >
            {isSubmitting ? "Saving..." : initialData ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
