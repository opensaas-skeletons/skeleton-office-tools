import { useState, useEffect, useCallback } from "react";
import {
  getSignatures,
  saveSignature,
  deleteSignature,
} from "../db/sqlite";
import type { Signature } from "../types/signature";

interface UseSignaturesReturn {
  signatures: Signature[];
  addSignature: (name: string, fontFamily: string, color: string) => Promise<Signature>;
  removeSignature: (id: number) => Promise<void>;
  isLoading: boolean;
}

export function useSignatures(): UseSignaturesReturn {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSignatures = useCallback(async () => {
    try {
      const rows = await getSignatures();
      setSignatures(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          fontFamily: r.font_family,
          color: r.color,
          createdAt: r.created_at,
        }))
      );
    } catch (err) {
      console.error("Failed to load signatures:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSignatures();
  }, [loadSignatures]);

  const addSignature = useCallback(
    async (name: string, fontFamily: string, color: string): Promise<Signature> => {
      const id = await saveSignature(name, fontFamily, color);
      const newSig: Signature = {
        id,
        name,
        fontFamily,
        color,
        createdAt: new Date().toISOString(),
      };
      setSignatures((prev) => [newSig, ...prev]);
      return newSig;
    },
    []
  );

  const removeSignature = useCallback(async (id: number) => {
    await deleteSignature(id);
    setSignatures((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    signatures,
    addSignature,
    removeSignature,
    isLoading,
  };
}
