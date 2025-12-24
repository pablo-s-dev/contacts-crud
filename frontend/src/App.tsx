import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ContactList } from "./features/contacts/ContactList";
import { ContactDialog } from "./features/contacts/ContactDialog";
import { useContacts } from "./hooks/useContacts";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus } from "lucide-react";
import type { Contact } from "./types/contact";
import { Pagination } from "./components/Pagination";
import { SearchInput } from "./components/SearchInput";
import { ConfirmationDialog } from "./components/ConfirmationDialog";
import { ContactListSkeleton } from "./components/ContactListSkeleton";

const queryClient = new QueryClient();

function ContactsApp() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>(
    undefined
  );

  // Confirmation dialog state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);

  const { data, isFetching, isError, deleteContact } = useContacts({
    page,
    pageSize: 10,
    q: searchQuery,
    sort,
    order,
  });

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleCreate = () => {
    setEditingContact(undefined);
    setIsDialogOpen(true);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setContactToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (contactToDelete) {
      deleteContact.mutate(contactToDelete);
      setContactToDelete(null);
    }
  };

  const handleSort = (field: string) => {
    if (sort === field) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(field);
      setOrder("asc");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Contacts
          </h1>
          <Button className="gap-2" onClick={handleCreate}>
            <Plus className="h-4 w-4" /> Add Contact
          </Button>
          <ContactDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            contact={editingContact}
          />
        </div>

        <Card>
          <CardHeader>
            <SearchInput
              value={searchInput}
              onChange={setSearchInput}
              onSearch={handleSearch}
              isLoading={isFetching}
              className="mt-4"
            />
          </CardHeader>
          <CardContent>
            {isError ? (
              <div className="text-center py-10 text-destructive">
                Error loading contacts
              </div>
            ) : isFetching ? (
              <ContactListSkeleton amount={10}/>
            ) : (
              <div className="space-y-4">
                <ContactList
                  contacts={data?.data || []}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  sort={sort}
                  order={order}
                  onSort={handleSort}
                />

                <Pagination
                  page={page}
                  totalPages={data?.totalPages || 1}
                  onPageChange={setPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmationDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Delete Contact"
        description="Are you sure you want to delete this contact? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
      <Toaster richColors position="top-right" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ContactsApp />
    </QueryClientProvider>
  );
}
