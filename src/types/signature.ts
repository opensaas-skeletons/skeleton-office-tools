export interface Signature {
  id: number;
  name: string;
  fontFamily: string;
  color: string;
  createdAt: string;
}

export const SIGNATURE_FONTS = [
  { label: "Elegant", family: "Dancing Script", className: "font-signature-1" },
  { label: "Formal", family: "Great Vibes", className: "font-signature-2" },
  { label: "Classic", family: "Sacramento", className: "font-signature-3" },
] as const;

export const SIGNATURE_COLORS = [
  { label: "Black", value: "#000000" },
  { label: "Dark Blue", value: "#1a237e" },
  { label: "Navy", value: "#0d47a1" },
] as const;
