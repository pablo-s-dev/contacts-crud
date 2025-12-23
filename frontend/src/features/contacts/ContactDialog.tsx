import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContactForm } from "./ContactForm";
import { useContacts } from "../../hooks/useContacts";
import type { Contact, ContactInput } from "../../types/contact";

interface ContactDialogProps {
  contact?: Contact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactDialog({
  contact,
  open,
  onOpenChange,
}: ContactDialogProps) {
  const { createContact, updateContact } = useContacts({
    page: 1,
    pageSize: 10,
    sort: "createdAt",
    order: "desc",
  });

  const handleSubmit = (data: ContactInput) => {
    if (contact) {
      updateContact.mutate(
        { id: contact.id, data },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      createContact.mutate(data, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-8">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold">
            {contact ? "Edit Contact" : "New Contact"}
          </DialogTitle>
        </DialogHeader>
        <ContactForm
          initialData={contact}
          onSubmit={handleSubmit}
          isSubmitting={createContact.isPending || updateContact.isPending}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
