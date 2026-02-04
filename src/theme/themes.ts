export interface Theme {
  id: string;
  name: string;
  bg: string;
  header: string;
  accent: string;
  text: string;
  boxBorder: string;
  boxBg: string;
  bubbleBg: string;
}

export const THEMES: Theme[] = [
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    bg: "#0a0a0c",
    header: "#ff00ff",
    accent: "#00ffff",
    text: "#ffffff",
    boxBorder: "#00ffff",
    boxBg: "rgba(0, 255, 255, 0.1)",
    bubbleBg: "rgba(255, 0, 255, 0.2)"
  },
  {
    id: "classic",
    name: "Classic",
    bg: "#f3c483",
    header: "#f68b1f",
    accent: "#8b4513",
    text: "#8b4513",
    boxBorder: "#e8d5b5",
    boxBg: "rgba(255, 255, 255, 0.2)",
    bubbleBg: "rgba(255, 255, 255, 0.4)"
  },
  {
    id: "midnight",
    name: "Midnight",
    bg: "#1a1a2e",
    header: "#16213e",
    accent: "#e94560",
    text: "#ffffff",
    boxBorder: "#0f3460",
    boxBg: "rgba(22, 33, 62, 0.5)",
    bubbleBg: "rgba(233, 69, 96, 0.3)"
  },
  {
    id: "forest",
    name: "Forest",
    bg: "#2d5a27",
    header: "#1b3a16",
    accent: "#aed581",
    text: "#f1f8e9",
    boxBorder: "#33691e",
    boxBg: "rgba(255, 255, 255, 0.1)",
    bubbleBg: "rgba(255, 255, 255, 0.2)"
  },
  {
    id: "ocean",
    name: "Ocean",
    bg: "#0077b6",
    header: "#023e8a",
    accent: "#caf0f8",
    text: "#ffffff",
    boxBorder: "#00b4d8",
    boxBg: "rgba(255, 255, 255, 0.15)",
    bubbleBg: "rgba(202, 240, 248, 0.2)"
  },
  {
    id: "sunset",
    name: "Sunset",
    bg: "#ff5f6d",
    header: "#ffc371",
    accent: "#ffffff",
    text: "#4b0000",
    boxBorder: "#ffc371",
    boxBg: "rgba(255, 255, 255, 0.2)",
    bubbleBg: "rgba(255, 255, 255, 0.4)"
  },
  {
    id: "candy",
    name: "Candy",
    bg: "#ffafbd",
    header: "#ffc3a0",
    accent: "#ffffff",
    text: "#880e4f",
    boxBorder: "#fff1eb",
    boxBg: "rgba(255, 255, 255, 0.3)",
    bubbleBg: "rgba(255, 255, 255, 0.5)"
  },
  {
    id: "mono",
    name: "Minimalist",
    bg: "#f5f5f5",
    header: "#333333",
    accent: "#000000",
    text: "#333333",
    boxBorder: "#cccccc",
    boxBg: "rgba(0, 0, 0, 0.05)",
    bubbleBg: "rgba(0, 0, 0, 0.1)"
  },
  {
    id: "gold",
    name: "Luxury",
    bg: "#2c2c2c",
    header: "#c5a059",
    accent: "#ffd700",
    text: "#ffffff",
    boxBorder: "#c5a059",
    boxBg: "rgba(197, 160, 89, 0.1)",
    bubbleBg: "rgba(197, 160, 89, 0.3)"
  },
  {
    id: "inferno",
    name: "Inferno",
    bg: "#4b0000",
    header: "#ff4500",
    accent: "#ff8c00",
    text: "#ffffff",
    boxBorder: "#ff4500",
    boxBg: "rgba(255, 69, 0, 0.1)",
    bubbleBg: "rgba(255, 140, 0, 0.3)"
  }
];
