"use client";

import { memo } from "react";
import type { BlockDef } from "@/lib/types";
import { AccessoriesBlock, CheckBlock, ChoiceBlock, ChoiceQtyBlock, DateBlock, QtyListBlock, RoutesBlock, SelectBlock, TextBlock, type OnChange } from "./blocks";
import { PhotosBlock, UploadBlock } from "./media";
import { CameraSetsBlock, DataPointsBlock, ManpowerBlock, MaterialsBlock } from "./special";

interface Props {
  block: BlockDef;
  value: unknown;
  onChange: OnChange;
  surveyId: string;
}

/** Renders one schema block. Memoised so typing in one field doesn't re-render the other ~70. */
export const BlockRenderer = memo(function BlockRenderer({ block, value, onChange, surveyId }: Props) {
  switch (block.t) {
    case "heading":
      return <h4 className="sub-title">{block.text}</h4>;
    case "text":
    case "textarea":
    case "number":
      return <TextBlock block={block} value={value} onChange={onChange} />;
    case "date":
      return <DateBlock block={block} value={value} onChange={onChange} />;
    case "select":
      return <SelectBlock block={block} value={value} onChange={onChange} />;
    case "choice":
      return <ChoiceBlock block={block} value={value} onChange={onChange} />;
    case "check":
      return <CheckBlock block={block} value={value} onChange={onChange} />;
    case "routes":
      return <RoutesBlock block={block} value={value} onChange={onChange} />;
    case "accessories":
      return <AccessoriesBlock block={block} value={value} onChange={onChange} />;
    case "qtyList":
      return <QtyListBlock block={block} value={value} onChange={onChange} />;
    case "choiceQty":
      return <ChoiceQtyBlock block={block} value={value} onChange={onChange} />;
    case "photos":
      return <PhotosBlock block={block} value={value} onChange={onChange} surveyId={surveyId} />;
    case "upload":
      return <UploadBlock block={block} value={value} onChange={onChange} surveyId={surveyId} />;
    case "dataPoints":
      return <DataPointsBlock block={block} value={value} onChange={onChange} />;
    case "materials":
      return <MaterialsBlock block={block} value={value} onChange={onChange} />;
    case "manpower":
      return <ManpowerBlock block={block} value={value} onChange={onChange} />;
    case "cameraSets":
      return <CameraSetsBlock block={block} value={value} onChange={onChange} />;
  }
});
