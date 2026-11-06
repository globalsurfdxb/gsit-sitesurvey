"use client";

import { useEffect, useMemo, useState } from "react";
import { getCatalog, onLocalChange } from "@/lib/local-db";
import { resolveForm } from "@/lib/survey";
import type { Catalog, DepartmentInfo, FormInfo, FormSchema } from "@/lib/types";

const NONE: never[] = [];

/**
 * The departments and forms this user can see, from the copy cached on the device
 * (refreshed by every sync), so it works offline.
 */
export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null | undefined>(undefined); // undefined = still reading

  useEffect(() => {
    let live = true;
    const load = () => getCatalog().then((c) => live && setCatalog(c));
    load();
    const off = onLocalChange(load);
    return () => {
      live = false;
      off();
    };
  }, []);

  return useMemo(() => {
    const departments: DepartmentInfo[] = catalog?.departments ?? NONE;
    const forms: FormInfo[] = catalog?.forms ?? NONE;
    const schemas = new Map<string, FormSchema>(forms.map((f) => [f.id, f.schema]));
    return {
      /** False until the cached copy has been read (it may still be empty before the first sync). */
      loaded: catalog !== undefined,
      departments,
      forms,
      schemas,
      /** A survey's form; the bundled ELV checklist stands in for ELV surveys until the catalog arrives. */
      formFor: (formId: string | undefined) => resolveForm(schemas, formId),
      department: (id: string | undefined) => departments.find((d) => d.id === id),
      form: (id: string | undefined) => forms.find((f) => f.id === id),
    };
  }, [catalog]);
}

export type CatalogView = ReturnType<typeof useCatalog>;
