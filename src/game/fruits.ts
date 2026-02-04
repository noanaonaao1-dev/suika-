export interface FruitType {
  id: number;
  name: string;
  radius: number;
  color: string;
  score: number;
}

export const FRUIT_TYPES: FruitType[] = [
  { id: 0, name: "さくらんぼ", radius: 15, color: "#ff4d4d", score: 1 },
  { id: 1, name: "いちご", radius: 22, color: "#ff8080", score: 3 },
  { id: 2, name: "ぶどう", radius: 30, color: "#cc66ff", score: 6 },
  { id: 3, name: "デコポン", radius: 36, color: "#ffcc00", score: 10 },
  { id: 4, name: "オレンジ", radius: 45, color: "#ff9933", score: 15 },
  { id: 5, name: "りんご", radius: 55, color: "#ff3333", score: 21 },
  { id: 6, name: "梨", radius: 65, color: "#ffffcc", score: 28 },
  { id: 7, name: "桃", radius: 78, color: "#ffccff", score: 36 },
  { id: 8, name: "パイナップル", radius: 92, color: "#ffff00", score: 45 },
  { id: 9, name: "メロン", radius: 108, color: "#99ff99", score: 55 },
  { id: 10, name: "スイカ", radius: 130, color: "#006600", score: 66 },
];
