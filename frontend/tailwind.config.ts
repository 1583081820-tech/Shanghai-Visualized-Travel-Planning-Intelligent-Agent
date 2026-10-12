import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        // ========== 原有动画完整保留 ==========
        "twinkle": "twinkle 2s infinite alternate",
        "tilt": "tilt 8s infinite linear",
        "spin-slow": "spin 8s linear infinite",

        // ========== 新增：页面用到的全部自定义动画 ==========
        // 背景光晕呼吸动效
        "ambient-breathe-1": "breathe 8s ease-in-out infinite",
        "ambient-breathe-2": "breathe 10s ease-in-out infinite reverse",
        // 缓慢弹跳（向下箭头、天气图标）
        "bounce-slow": "bounceSlow 3s ease-in-out infinite",
        // 输入框/卡片发光效果
        "apple-glow": "appleGlow 2s ease-in-out infinite",
        // 元素淡入入场
        "fadeIn": "fadeIn 0.5s ease-out forwards",
        // 渐变背景流动效果
        "gradient": "gradient 3s linear infinite",
      },

      keyframes: {
        // ========== 补充原有动画的关键帧（缺失会导致动画不生效） ==========
        twinkle: {
          "0%": { opacity: "0.3" },
          "100%": { opacity: "1" },
        },
        tilt: {
          "0%": { transform: "rotate(0deg)" },
          "50%": { transform: "rotate(2deg)" },
          "100%": { transform: "rotate(0deg)" },
        },

        // ========== 新增动画对应的关键帧 ==========
        // 背景光晕呼吸
        breathe: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
        // 缓慢弹跳
        bounceSlow: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        // 苹果风格发光
        appleGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(99, 102, 241, 0.15)" },
          "50%": { boxShadow: "0 0 40px rgba(99, 102, 241, 0.3)" },
        },
        // 淡入上移动画
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // 渐变背景流动
        gradient: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
    },
  },

  plugins: [
    // 修正：自定义工具类必须通过插件注册，写在 theme.extend 中不会生效
    plugin(({ addUtilities }) => {
      addUtilities({
        // 你原有的发光工具类
        ".glow-blue": {
          filter: "drop-shadow(0 0 4px rgba(59, 130, 246, 0.8))",
        },
        // 补充页面用到的自定义滚动条样式
        ".custom-scrollbar": {
          "&::-webkit-scrollbar": {
            width: "6px",
            height: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(99, 102, 241, 0.2)",
            borderRadius: "3px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "rgba(99, 102, 241, 0.4)",
          },
        },
      });
    }),
  ],
} satisfies Config;