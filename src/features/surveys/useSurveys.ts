"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { useUi } from "@/components/ui/UiProvider";
import { useCatalog } from "@/features/catalog/useCatalog";
import { canViewSurvey } from "@/lib/access";
import { listSurveys, onLocalChange, patchSurvey, removeSurveyLocal, type LocalSurvey } from "@/lib/local-db";
import { surveyTitle } from "@/lib/survey";

export interface SurveyGroups {
  /** Everything this person may open, newest first. */
  all: LocalSurvey[];
  /** Surveys they own. */
  mine: LocalSurvey[];
  /** Other people's surveys they may review (their department's, for a team lead; everything for a super admin). */
  team: LocalSurvey[];
}

/** Surveys from this device that the signed-in user may see. `null` until first read. */
export function useLocalSurveys(): SurveyGroups | null {
  const { user } = useApp();
  const [all, setAll] = useState<LocalSurvey[] | null>(null);

  useEffect(() => {
    let live = true;
    const load = () => listSurveys().then((s) => live && setAll(s));
    load();
    const off = onLocalChange(load);
    return () => {
      live = false;
      off();
    };
  }, []);

  return useMemo(() => {
    if (all === null) return null;
    const visible = all.filter((s) => !user || canViewSurvey(user, { ownerId: s.ownerId, departmentId: s.departmentId ?? "elv" })).sort((a, b) => b.updatedAt - a.updatedAt);
    return { all: visible, mine: visible.filter((s) => !user || s.ownerId === user.id), team: visible.filter((s) => user && s.ownerId !== user.id) };
  }, [all, user]);
}

export function useSurveyActions() {
  const { requestSync } = useApp();
  const { confirm, toast } = useUi();
  const catalog = useCatalog();

  const remove = useCallback(
    async (s: LocalSurvey) => {
      const ok = await confirm({
        title: "Delete this survey?",
        message: `“${surveyTitle(catalog.formFor(s.formId), s.values)}” will be removed from this device${s.rev > 0 ? " and from the server once you're online" : ""}. This can't be undone.`,
        confirmLabel: "Delete",
        danger: true,
      });
      if (!ok) return;
      if (s.rev === 0) await removeSurveyLocal(s.id); // never reached the server
      else {
        await patchSurvey(s.id, (x) => {
          x.deleted = true;
        });
        requestSync(true);
      }
      toast("Survey deleted", "info");
    },
    [confirm, toast, requestSync, catalog],
  );

  return { remove };
}
