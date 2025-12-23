import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Contact } from "../../types/contact";
import { Edit, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SortIcon } from "@/components/SortIcon";
import { format } from "date-fns";

interface ContactListProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
  sort?: string;
  order?: "asc" | "desc";
  onSort?: (field: string) => void;
}

export function ContactList({
  contacts,
  onEdit,
  onDelete,
  sort,
  order,
  onSort,
}: ContactListProps) {
  if (contacts.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        No contacts found.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border overflow-hidden">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button
                onClick={() => onSort?.("name")}
                className="flex items-center hover:text-foreground font-semibold"
                data-testid="sort-name"
              >
                Name <SortIcon field="name" sort={sort} order={order} />
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => onSort?.("email")}
                className="flex items-center hover:text-foreground font-semibold"
                data-testid="sort-email"
              >
                Email <SortIcon field="email" sort={sort} order={order} />
              </button>
            </TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>
              <button
                onClick={() => onSort?.("createdAt")}
                className="flex items-center hover:text-foreground font-semibold"
                data-testid="sort-createdAt"
              >
                Created <SortIcon field="createdAt" sort={sort} order={order} />
              </button>
            </TableHead>
            <TableHead className="text-right w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence initial={false}>
            {contacts.map((contact) => (
              <motion.tr
                key={contact.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{
                  opacity: 0,
                  x: 50,
                  transition: { duration: 0.2 },
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                data-testid="contact-row"
              >
                <TableCell className="font-medium max-w-[200px]">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="truncate">{contact.name}</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{contact.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="max-w-[250px]">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="truncate">{contact.email}</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{contact.email}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="max-w-[150px]">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="truncate">{contact.phone}</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{contact.phone}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {format(new Date(contact.createdAt), "MMM dd, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-2 justify-end">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(contact)}
                        data-testid="edit-button"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(contact.id)}
                        data-testid="delete-button"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </motion.div>
                  </div>
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
    </TooltipProvider>
  );
}
