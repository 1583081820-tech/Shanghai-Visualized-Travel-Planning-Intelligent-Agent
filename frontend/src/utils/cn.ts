import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// 完整版标准cn函数（解决Tailwind样式冲突）
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
