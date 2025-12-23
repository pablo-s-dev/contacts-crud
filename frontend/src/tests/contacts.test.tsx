import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ContactList } from "../features/contacts/ContactList";
import { ContactForm } from "../features/contacts/ContactForm";
import { Pagination } from "../components/Pagination";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    tr: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <tr {...props}>{children}</tr>
    ),
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Edit: () => <span data-testid="edit-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  ChevronLeft: () => <span data-testid="prev-icon" />,
  ChevronRight: () => <span data-testid="next-icon" />,
}));

const mockContacts = [
  {
    id: "1",
    name: "Alice",
    email: "alice@example.com",
    phone: "+55 11 91111-1111",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Bob",
    email: "bob@example.com",
    phone: "+55 11 92222-2222",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe("Frontend Component Tests", () => {
  // Test 1: List - Render Contacts
  it("should render the list of contacts correctly", () => {
    render(
      <ContactList
        contacts={mockContacts}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getAllByTestId("contact-row")).toHaveLength(2);
  });

  // Test 2: List - Empty State
  it("should display empty state message when list is empty", () => {
    render(<ContactList contacts={[]} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/No contacts found/i)).toBeInTheDocument();
  });

  // Test 3: List - Action Buttons
  it("should trigger edit and delete callbacks", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <ContactList
        contacts={[mockContacts[0]]}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByTestId("edit-button"));
    expect(onEdit).toHaveBeenCalledWith(mockContacts[0]);

    fireEvent.click(screen.getByTestId("delete-button"));
    expect(onDelete).toHaveBeenCalledWith(mockContacts[0].id);
  });

  // Test 4: List - Sorting Trigger
  it("should trigger onSort when clicking headers", () => {
    const onSort = vi.fn();
    render(
      <ContactList
        contacts={mockContacts}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSort={onSort}
      />
    );

    fireEvent.click(screen.getByTestId("sort-name"));
    expect(onSort).toHaveBeenCalledWith("name");
  });

  // Test 5: Form - Validation
  it("should show errors for invalid input", async () => {
    render(<ContactForm onCancel={vi.fn()} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Invalid email address/i)).toBeInTheDocument();
    });
  });

  // Test 6: Form - Pre-fill
  it("should pre-fill fields when initialData is provided", () => {
    render(
      <ContactForm
        initialData={mockContacts[0]}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue("Alice")).toBeInTheDocument();
    expect(screen.getByDisplayValue("alice@example.com")).toBeInTheDocument();
  });

  // Test 7: Form - Loading State
  it("should show saving state and disable submit button", () => {
    render(
      <ContactForm onCancel={vi.fn()} onSubmit={vi.fn()} isSubmitting={true} />
    );

    const btn = screen.getByTestId("submit-button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent(/Saving/i);
  });

  // Test 8: Form - Cancellation
  it("should trigger onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<ContactForm onCancel={onCancel} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByTestId("cancel-button"));
    expect(onCancel).toHaveBeenCalled();
  });

  // Test 9: Pagination - Interaction
  it("should trigger page change on next/prev click", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={3} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByTestId("next-page"));
    expect(onPageChange).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("prev-page"));
    expect(onPageChange).toHaveBeenCalledTimes(2);
  });

  // Test 10: Pagination - Boundaries
  it("should disable prev on first page and next on last page", () => {
    const { rerender } = render(
      <Pagination page={1} totalPages={2} onPageChange={vi.fn()} />
    );
    expect(screen.getByTestId("prev-page")).toBeDisabled();
    expect(screen.getByTestId("next-page")).not.toBeDisabled();

    rerender(<Pagination page={2} totalPages={2} onPageChange={vi.fn()} />);
    expect(screen.getByTestId("prev-page")).not.toBeDisabled();
    expect(screen.getByTestId("next-page")).toBeDisabled();
  });
});
