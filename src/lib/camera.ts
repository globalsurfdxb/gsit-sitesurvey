// Camera-set option lists (taken from the checklist's JS-built camera card).
export interface CamOption { label: string; spec?: string }

export const CAMERA_ROWS: { field: "type" | "brand" | "resolution" | "night" | "audio" | "ai"; label: string; options: CamOption[] }[] = [
  {
    field: "type",
    label: "Camera type",
    options: ["Dome", "Bullet", "PTZ", "Turret", "Fisheye", "ANPR/LPR", "Thermal", "Dual lens"].map((label) => ({ label })),
  },
  {
    field: "brand",
    label: "Brand",
    options: ["Hikvision", "Dahua", "Samsung", "Axis", "Bosch", "Other"].map((label) => ({ label })),
  },
  {
    field: "resolution",
    label: "Resolution",
    options: [
      { label: "2MP", spec: "1080p" },
      { label: "4MP", spec: "1440p" },
      { label: "5MP", spec: "1944p" },
      { label: "8MP", spec: "4K" },
      { label: "12MP", spec: "4K+" },
    ],
  },
  { field: "night", label: "Night vision", options: ["IR", "ColorVu", "Starlight", "Smart IR"].map((label) => ({ label })) },
  { field: "audio", label: "Audio", options: ["Built-in mic", "Two-way audio", "Audio recording", "None"].map((label) => ({ label })) },
  {
    field: "ai",
    label: "AI features",
    options: ["Motion detection", "Human detection", "Vehicle detection", "Face recognition", "Line crossing", "Intrusion detection", "ANPR/LPR"].map((label) => ({ label })),
  },
];
