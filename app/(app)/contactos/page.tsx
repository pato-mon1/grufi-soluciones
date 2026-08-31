import type { Metadata } from "next";
import { ContactosView } from "@/components/contactos/contactos-view";

export const metadata: Metadata = {
  title: "Contactos · GRUFI SOLUCIONES",
};

export default function ContactosPage() {
  return <ContactosView />;
}
