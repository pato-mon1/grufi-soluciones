"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { usandoSupabase } from "@/lib/repository";
import { getSupabaseClient } from "@/lib/supabase/client";
import { generarId } from "@/lib/utils";

const BUCKET = "archivos-empresas";
const TAMANO_MAX = 25 * 1024 * 1024; // 25 MB

export interface ArchivoEmpresa {
  id: string;
  empresaId: string;
  nombre: string;
  ruta: string;
  tamano: number;
  tipo: string;
  fechaCreacion: string;
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "Ocurrió un error inesperado.";
}

interface EstadoArchivos {
  disponible: boolean;
  cargando: boolean;
  subiendo: boolean;
  archivos: ArchivoEmpresa[];
  subir: (archivos: FileList | File[]) => Promise<void>;
  eliminar: (archivo: ArchivoEmpresa) => Promise<void>;
  descargar: (archivo: ArchivoEmpresa) => Promise<void>;
}

export function useArchivosEmpresa(empresaId: string): EstadoArchivos {
  const disponible = usandoSupabase();
  const montado = useRef(true);
  const [cargando, setCargando] = useState(disponible);
  const [subiendo, setSubiendo] = useState(false);
  const [archivos, setArchivos] = useState<ArchivoEmpresa[]>([]);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    if (!disponible || !empresaId) {
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      const { data, error } = await getSupabaseClient()
        .from("archivos_empresa")
        .select("id, empresa_id, nombre, ruta, tamano, tipo, fecha_creacion")
        .eq("empresa_id", empresaId)
        .order("fecha_creacion", { ascending: false });
      if (error) throw new Error(error.message);
      if (!montado.current) return;
      setArchivos(
        (data ?? []).map((f) => ({
          id: f.id,
          empresaId: f.empresa_id,
          nombre: f.nombre,
          ruta: f.ruta,
          tamano: Number(f.tamano ?? 0),
          tipo: f.tipo ?? "",
          fechaCreacion: f.fecha_creacion,
        })),
      );
    } catch (e) {
      toast.error("No se pudieron cargar los archivos", {
        description: msg(e),
      });
    } finally {
      if (montado.current) setCargando(false);
    }
  }, [disponible, empresaId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const subir = useCallback(
    async (entrada: FileList | File[]) => {
      const lista = Array.from(entrada);
      if (lista.length === 0) return;
      setSubiendo(true);
      const sb = getSupabaseClient();
      let ok = 0;
      try {
        for (const file of lista) {
          if (file.size > TAMANO_MAX) {
            toast.error(`"${file.name}" supera el límite de 25 MB.`);
            continue;
          }
          const ext = file.name.includes(".")
            ? file.name.split(".").pop()
            : "";
          const ruta = `${empresaId}/${generarId()}${ext ? `.${ext}` : ""}`;
          const { error: errSubida } = await sb.storage
            .from(BUCKET)
            .upload(ruta, file, {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });
          if (errSubida) {
            toast.error(`No se pudo subir "${file.name}"`, {
              description: errSubida.message,
            });
            continue;
          }
          const { error: errMeta } = await sb.from("archivos_empresa").insert({
            empresa_id: empresaId,
            nombre: file.name,
            ruta,
            tamano: file.size,
            tipo: file.type || "",
          });
          if (errMeta) {
            await sb.storage.from(BUCKET).remove([ruta]);
            toast.error(`No se pudo registrar "${file.name}"`, {
              description: errMeta.message,
            });
            continue;
          }
          ok += 1;
        }
        if (ok > 0) {
          toast.success(
            ok === 1 ? "Archivo subido" : `${ok} archivos subidos`,
          );
          await cargar();
        }
      } finally {
        setSubiendo(false);
      }
    },
    [empresaId, cargar],
  );

  const eliminar = useCallback(
    async (archivo: ArchivoEmpresa) => {
      const previo = archivos;
      setArchivos((prev) => prev.filter((a) => a.id !== archivo.id));
      try {
        const sb = getSupabaseClient();
        await sb.storage.from(BUCKET).remove([archivo.ruta]);
        const { error } = await sb
          .from("archivos_empresa")
          .delete()
          .eq("id", archivo.id);
        if (error) throw new Error(error.message);
        toast.success("Archivo eliminado");
      } catch (e) {
        setArchivos(previo);
        toast.error("No se pudo eliminar el archivo", { description: msg(e) });
      }
    },
    [archivos],
  );

  const descargar = useCallback(async (archivo: ArchivoEmpresa) => {
    try {
      const { data, error } = await getSupabaseClient()
        .storage.from(BUCKET)
        .createSignedUrl(archivo.ruta, 120);
      if (error || !data?.signedUrl) {
        throw new Error(error?.message ?? "Sin URL");
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error("No se pudo abrir el archivo", { description: msg(e) });
    }
  }, []);

  return {
    disponible,
    cargando,
    subiendo,
    archivos,
    subir,
    eliminar,
    descargar,
  };
}

/** Tamaño legible (B, KB, MB). */
export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
