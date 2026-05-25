export interface ParsedDescription {
  description: string;
  imageUrl: string;
}

export function parseDescription(rawDesc: string | null): ParsedDescription {
  if (!rawDesc) return { description: "", imageUrl: "" };
  if (rawDesc.includes("||image_url:")) {
    const parts = rawDesc.split("||image_url:");
    return { description: parts[0] || "", imageUrl: parts[1] || "" };
  }
  return { description: rawDesc, imageUrl: "" };
}

export function formatDescription(description: string, imageUrl: string): string {
  if (!imageUrl) return description;
  return `${description}||image_url:${imageUrl}`;
}
