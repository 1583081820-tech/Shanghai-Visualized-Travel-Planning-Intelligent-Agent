import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText as GSAPSplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP);

export interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string | ((t: number) => number);
  splitType?: 'chars' | 'words' | 'lines' | 'words, chars';
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  threshold?: number;
  rootMargin?: string;
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
  textAlign?: React.CSSProperties['textAlign'];
  onLetterAnimationComplete?: () => void;
  replay?: boolean; // 是否每次进入视口都重新播放
  startDelay?: number; // 动画开始前的延迟（毫秒）
}

const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = '',
  delay = 50,
  duration = 1.25,
  ease = 'power3.out',
  splitType = 'chars',
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = '-100px',
  textAlign = 'center',
  tag = 'p',
  onLetterAnimationComplete,
  replay = false,
  startDelay = 0,
}) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const onCompleteRef = useRef(onLetterAnimationComplete);
  const [fontsLoaded, setFontsLoaded] = useState<boolean>(false);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const splitInstanceRef = useRef<GSAPSplitText | null>(null);
  const targetsRef = useRef<Element[]>([]);

  // Keep callback ref updated
  useEffect(() => {
    onCompleteRef.current = onLetterAnimationComplete;
  }, [onLetterAnimationComplete]);

  useEffect(() => {
    if (document.fonts.status === 'loaded') {
      setFontsLoaded(true);
    } else {
      document.fonts.ready.then(() => {
        setFontsLoaded(true);
      });
    }
  }, []);

  useGSAP(
    () => {
      if (!ref.current || !text || !fontsLoaded) return;

      const el = ref.current as HTMLElement;

      // 查找最近的可滚动父元素作为 scroller
      const findScroller = (element: HTMLElement): HTMLElement | Window => {
        let current = element.parentElement;
        while (current) {
          const style = window.getComputedStyle(current);
          const overflowY = style.overflowY;
          if (overflowY === 'auto' || overflowY === 'scroll') {
            return current;
          }
          current = current.parentElement;
        }
        return window;
      };

      const scroller = findScroller(el);

      // 清理之前的实例
      const cleanup = () => {
        if (tweenRef.current) {
          tweenRef.current.kill();
          tweenRef.current = null;
        }
        if (splitInstanceRef.current) {
          try { splitInstanceRef.current.revert(); } catch (_) {}
          splitInstanceRef.current = null;
        }
        targetsRef.current = [];
      };

      cleanup();

      // 创建拆分实例
      const splitInstance = new GSAPSplitText(el, {
        type: splitType,
        smartWrap: true,
        autoSplit: splitType === 'lines',
        linesClass: 'split-line',
        wordsClass: 'split-word',
        charsClass: 'split-char',
        reduceWhiteSpace: false,
      });

      splitInstanceRef.current = splitInstance;

      // 获取目标元素
      let targets: Element[] = [];
      if (splitType.includes('chars') && splitInstance.chars.length) targets = splitInstance.chars;
      if (!targets.length && splitType.includes('words') && splitInstance.words.length) targets = splitInstance.words;
      if (!targets.length && splitType.includes('lines') && splitInstance.lines.length) targets = splitInstance.lines;
      if (!targets.length) targets = splitInstance.chars || splitInstance.words || splitInstance.lines;

      targetsRef.current = targets;

      // 立即设置到起始状态（隐藏）
      gsap.set(targets, { ...from });

      // 计算触发位置
      const startPct = (1 - threshold) * 100;
      const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
      const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
      const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px';
      const sign =
        marginValue === 0
          ? ''
          : marginValue < 0
            ? `-=${Math.abs(marginValue)}${marginUnit}`
            : `+=${marginValue}${marginUnit}`;
      const start = `top ${startPct}%${sign}`;

      // 创建动画函数
      const playAnimation = () => {
        if (tweenRef.current) {
          tweenRef.current.kill();
        }
        // 确保从起始状态开始
        gsap.set(targetsRef.current, { ...from });
        const tween = gsap.to(targetsRef.current, {
          ...to,
          duration,
          ease,
          delay: startDelay / 1000,
          stagger: delay / 1000,
          willChange: 'transform, opacity',
          force3D: true,
          onComplete: () => {
            onCompleteRef.current?.();
          },
        });
        tweenRef.current = tween;
      };

      // 重置到起始状态
      const resetAnimation = () => {
        if (tweenRef.current) {
          tweenRef.current.kill();
          tweenRef.current = null;
        }
        gsap.set(targetsRef.current, { ...from });
      };

      if (replay) {
        // 每次进入视口都重新播放
        ScrollTrigger.create({
          trigger: el,
          scroller: scroller,
          start: start,
          end: 'bottom top',
          onEnter: () => {
            playAnimation();
          },
          onEnterBack: () => {
            playAnimation();
          },
          onLeave: () => {
            resetAnimation();
          },
          onLeaveBack: () => {
            resetAnimation();
          },
        });
      } else {
        // 只播放一次
        ScrollTrigger.create({
          trigger: el,
          scroller: scroller,
          start: start,
          once: true,
          onEnter: () => {
            playAnimation();
          },
        });
      }

      return () => {
        ScrollTrigger.getAll().forEach(st => {
          if (st.trigger === el) st.kill();
        });
        cleanup();
      };
    },
    {
      dependencies: [
        text,
        delay,
        duration,
        ease,
        splitType,
        JSON.stringify(from),
        JSON.stringify(to),
        threshold,
        rootMargin,
        fontsLoaded,
        replay,
        startDelay,
      ],
      scope: ref,
    }
  );

  const renderTag = () => {
    const style: React.CSSProperties = {
      textAlign,
      display: 'block',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      willChange: 'transform, opacity',
    };
    const classes = `split-parent ${className}`;
    return React.createElement(tag || 'p', { ref, style, className: classes }, text);
  };
  return renderTag();
};

export default SplitText;
