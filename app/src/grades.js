// grades.js — five Vice City grades.
// Each grade: a CSS filter for the photo pass, a top and bottom
// overlay colour (screen blend), a tint for the title gradient,
// and a neon glow colour for the script subtitle.
export const GRADES = [
  {
    id: "sunset",
    name: "Sunset",
    blurb: "Orange-pink golden hour.",
    filter: "saturate(1.35) contrast(1.12) brightness(1.04)",
    top: "rgba(255, 94, 58, 0.16)",
    bottom: "rgba(168, 28, 120, 0.30)",
    titleFrom: "#ffd166",
    titleTo: "#ff5e7a",
    neon: "#ff9de2",
    glow: "#ff2e88",
  },
  {
    id: "neon",
    name: "Neon",
    blurb: "Hot pink + cyan night drive.",
    filter: "saturate(1.6) contrast(1.18) brightness(0.98)",
    top: "rgba(255, 0, 128, 0.22)",
    bottom: "rgba(0, 229, 255, 0.26)",
    titleFrom: "#00e5ff",
    titleTo: "#ff00a8",
    neon: "#7df9ff",
    glow: "#00e5ff",
  },
  {
    id: "vice",
    name: "Vice",
    blurb: "Teal palms, purple dusk.",
    filter: "saturate(1.25) contrast(1.08) hue-rotate(-12deg)",
    top: "rgba(0, 210, 180, 0.14)",
    bottom: "rgba(90, 30, 160, 0.34)",
    titleFrom: "#7ef0d4",
    titleTo: "#c77dff",
    neon: "#b8ffec",
    glow: "#7b2ff7",
  },
  {
    id: "noir",
    name: "Noir",
    blurb: "High-contrast night, low colour.",
    filter: "saturate(0.55) contrast(1.32) brightness(0.92)",
    top: "rgba(20, 20, 40, 0.20)",
    bottom: "rgba(0, 0, 0, 0.42)",
    titleFrom: "#f5f5f5",
    titleTo: "#ff5e5e",
    neon: "#ffd166",
    glow: "#ff3b30",
  },
  {
    id: "candy",
    name: "Candy",
    blurb: "Bubblegum pop, extra punch.",
    filter: "saturate(1.8) contrast(1.1) brightness(1.06)",
    top: "rgba(255, 110, 199, 0.20)",
    bottom: "rgba(255, 170, 0, 0.22)",
    titleFrom: "#ffe259",
    titleTo: "#ff6ec7",
    neon: "#ff8fd3",
    glow: "#ff1493",
  },
];

export function getGrade(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}
