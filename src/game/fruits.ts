export interface FruitType {
  id: number;
  name: string;
  radius: number;
  color: string;
  score: number;
  image: string;
}

export const FRUIT_TYPES: FruitType[] = [
  { id: 0, name: "さくらんぼ", radius: 15, color: "#ff4d4d", score: 1, image: "/assets/fruits/cherry.png" },
  { id: 1, name: "いちご", radius: 22, color: "#ff8080", score: 3, image: "/assets/fruits/strawberry.png" },
  { id: 2, name: "ぶどう", radius: 30, color: "#cc66ff", score: 6, image: "/assets/fruits/grape.png" },
  { id: 3, name: "オレンジ", radius: 38, color: "#ff9933", score: 10, image: "/assets/fruits/orange.png" },
  { id: 4, name: "かき", radius: 46, color: "#ff6600", score: 15, image: "/assets/fruits/persimmon.png" },
  { id: 5, name: "なし", radius: 56, color: "#ffffcc", score: 21, image: "/assets/fruits/pear.png" },
  { id: 6, name: "もも", radius: 68, color: "#ffccff", score: 28, image: "/assets/fruits/peach.png" },
  { id: 7, name: "パイナップル", radius: 82, color: "#ffff00", score: 36, image: "/assets/fruits/pineapple.png" },
  { id: 8, name: "メロン", radius: 100, color: "#99ff99", score: 45, image: "/assets/fruits/melon.png" },
  { id: 9, name: "スイカ", radius: 125, color: "#006600", score: 55, image: "/assets/fruits/watermelon.png" },
];
