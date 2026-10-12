import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// 保留这个功能完善的cn函数（shadcn/ui标准实现）
// 支持自动合并Tailwind CSS类名冲突，是我们TourIntroPage组件需要的版本
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 删除了重复的简单cn函数

// 全局通用工具函数，所有页面共用
export function formatCategory(c: string) {
  switch (c) {
    case "museum": return "博物馆";
    case "mall": return "商圈/商场";
    case "park": return "公园";
    case "landmark": return "地标";
    case "attraction": return "景点";
    case "university": return "大学";
    default: return "其它";
  }
}

export function money(n: number | null | undefined) {
  if (n == null) return "—";
  if (n === 0) return "免费";
  return `¥${Math.round(n)}`;
}

export const formatScore = (s: number) => s.toFixed(1);
export const formatPrice = (p: number) => `¥${p}/人`;