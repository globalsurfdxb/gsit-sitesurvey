import { asIconName, Icon } from "@/components/ui/Icon";
import { sectionIcon } from "@/lib/survey";
import type { SectionDef } from "@/lib/types";

/** The icon a form's author chose for a section (a clipboard if it names one the app doesn't have). */
export function SectionIcon({ section, size = 20, className }: { section: SectionDef; size?: number; className?: string }) {
  return <Icon name={asIconName(sectionIcon(section))} size={size} className={className} />;
}
