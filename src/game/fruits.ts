export interface FruitType {
  id: number;
  name: string;
  radius: number;
  score: number;
  color: string;
  image: string;
}

export const FRUIT_TYPES: FruitType[] = [
  { id: 0, name: "cherry", radius: 22, score: 1, color: "#ff0000", image: "/assets/fruits/cherry.png" },
  { id: 1, name: "strawberry", radius: 32, score: 3, color: "#ff3366", image: "/assets/fruits/strawberry.png" },
  { id: 2, name: "grape", radius: 46, score: 6, color: "#9900ff", image: "/assets/fruits/grape.png" },
  { id: 3, name: "persimmon", radius: 58, score: 10, color: "#ff9900", image: "/assets/fruits/persimmon.png" },
  { id: 4, name: "orange", radius: 75, score: 15, color: "#ffcc00", image: "/assets/fruits/orange.png" },
  { id: 5, name: "pear", radius: 95, score: 21, color: "#ffff66", image: "/assets/fruits/pear.png" },
  { id: 6, name: "peach", radius: 120, score: 28, color: "#ffcccc", image: "/assets/fruits/peach.png" },
  { id: 7, name: "pineapple", radius: 150, score: 36, color: "#ffff00", image: "/assets/fruits/pineapple.png" },
  { id: 8, name: "melon", radius: 185, score: 45, color: "#33ff33", image: "/assets/fruits/melon.png" },
  { id: 9, name: "watermelon", radius: 230, score: 55, color: "#006600", image: "/assets/fruits/watermelon.png" },
];
