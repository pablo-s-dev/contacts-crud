import axios from "axios";
import type { Contact, ContactInput } from "../types/contact";

const CONTACTS_API_URL = import.meta.env.VITE_CONTACTS_API_URL;

export const api = axios.create({
  baseURL: `${CONTACTS_API_URL}/v1`,
});

export type GetContactsParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: string;
  order?: "asc" | "desc";
};

export type GetContactsResponse = {
  data: Contact[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const contactService = {
  getAll: async (params: GetContactsParams) => {
    const response = await api.get<GetContactsResponse>("/contacts", {
      params,
    });
    return response.data;
  },
  create: async (data: ContactInput) => {
    const response = await api.post<Contact>("/contacts", data);
    return response.data;
  },
  update: async (id: string, data: ContactInput) => {
    const response = await api.put<Contact>(`/contacts/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    await api.delete(`/contacts/${id}`);
  },
};
