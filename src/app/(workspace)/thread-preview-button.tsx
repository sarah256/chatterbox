"use client";

import { MessageSquareText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useThreadParam } from "@/hooks/useThreadParam";

// Placeholder until phase 4 opens real threads from messages.
export function ThreadPreviewButton() {
  const { openThread } = useThreadParam();

  return (
    <Button variant="outline" onClick={() => openThread("preview")}>
      <MessageSquareText />
      Preview thread panel
    </Button>
  );
}
