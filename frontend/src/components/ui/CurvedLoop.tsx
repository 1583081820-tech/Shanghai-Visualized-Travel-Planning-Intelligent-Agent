import { useRef, useEffect, useState, useMemo, useId, FC, PointerEvent } from 'react';
import './CurvedLoop.css';

interface CurvedLoopProps {
  marqueeText?: string;
  speed?: number;
  className?: string;
  curveAmount?: number;
  direction?: 'left' | 'right';
  interactive?: boolean;
  fontWeight?: number | string;
  gradientColors?: string[];
}

const CurvedLoop: FC<CurvedLoopProps> = ({
  marqueeText = '',
  speed = 2,
  className,
  curveAmount = 0,
  direction = 'left',
  interactive = true,
  fontWeight = 'bold',
  gradientColors
}) => {
  const text = useMemo(() => {
    const hasTrailing = /\s|\u00A0$/.test(marqueeText);
    return (hasTrailing ? marqueeText.replace(/\s+$/, '') : marqueeText) + '\u00A0';
  }, [marqueeText]);

  const measureRef = useRef<SVGTextElement | null>(null);
  const textPathRef = useRef<SVGTextPathElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const [spacing, setSpacing] = useState(0);
  const [offset, setOffset] = useState(0);
  const uid = useId();
  const pathId = `curve-${uid}`;
  const gradientId = `gradient-${uid}`;
  
  // 路径范围，确保文字完全从边缘滑入滑出
  const pathD = `M-200,50 Q720,${50 + curveAmount} 1640,50`;

  const dragRef = useRef(false);
  const lastXRef = useRef(0);
  const dirRef = useRef<'left' | 'right'>(direction);
  const velRef = useRef(0);
  const rafRef = useRef<number>(0);

  const textLength = spacing;
  // 计算需要重复的次数，确保无缝循环
  const repeatCount = textLength ? Math.ceil(2000 / textLength) + 2 : 1;
  const totalText = textLength ? Array(repeatCount).fill(text).join('') : text;
  const ready = spacing > 0;

  // 测量文字宽度
  useEffect(() => {
    if (measureRef.current) {
      setSpacing(measureRef.current.getComputedTextLength());
    }
  }, [text, className, fontWeight]);

  // 初始化偏移
  useEffect(() => {
    if (!spacing || !textPathRef.current) return;
    const initial = 0;
    textPathRef.current.setAttribute('startOffset', initial + 'px');
    setOffset(initial);
  }, [spacing]);

  // 滚动动画 - 优化性能
  useEffect(() => {
    if (!spacing || !ready || !textPathRef.current) return;
    
    const pathEl = textPathRef.current;
    let lastTime = performance.now();
    let currentOffset = 0;
    
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      if (!dragRef.current) {
        // 基于时间差计算移动距离，确保不同帧率下速度一致
        const distance = (dirRef.current === 'right' ? speed : -speed) * (deltaTime / 16.67);
        currentOffset += distance;
        
        // 循环处理
        if (currentOffset <= -spacing) {
          currentOffset += spacing;
        } else if (currentOffset > 0) {
          currentOffset -= spacing;
        }
        
        pathEl.setAttribute('startOffset', currentOffset + 'px');
        setOffset(currentOffset);
      }
      
      rafRef.current = requestAnimationFrame(animate);
    };
    
    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [spacing, speed, ready]);

  const onPointerDown = (e: PointerEvent) => {
    if (!interactive) return;
    dragRef.current = true;
    lastXRef.current = e.clientX;
    velRef.current = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!interactive || !dragRef.current || !textPathRef.current || !spacing) return;
    const dx = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    velRef.current = dx;
    
    const pathEl = textPathRef.current!;
    const currentOffset = parseFloat(pathEl.getAttribute('startOffset') || '0');
    let newOffset = currentOffset + dx;
    
    if (newOffset <= -spacing) newOffset += spacing;
    if (newOffset > 0) newOffset -= spacing;
    
    pathEl.setAttribute('startOffset', newOffset + 'px');
    setOffset(newOffset);
  };

  const endDrag = () => {
    if (!interactive) return;
    dragRef.current = false;
    dirRef.current = velRef.current > 0 ? 'right' : 'left';
  };

  const cursorStyle = interactive ? (dragRef.current ? 'grabbing' : 'grab') : 'auto';

  return (
    <div
      className="curved-loop-jacket"
      style={{ visibility: ready ? 'visible' : 'hidden', cursor: cursorStyle }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      <svg 
        className="curved-loop-svg" 
        viewBox="-100 0 1640 100"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <path ref={pathRef} id={pathId} d={pathD} fill="none" stroke="transparent" />
          {gradientColors && gradientColors.length >= 2 && (
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              {gradientColors.map((color, idx) => (
                <stop
                  key={idx}
                  offset={`${(idx / (gradientColors.length - 1)) * 100}%`}
                  stopColor={color}
                />
              ))}
            </linearGradient>
          )}
        </defs>
        
        <text 
          ref={measureRef} 
          xmlSpace="preserve" 
          style={{ visibility: 'hidden', opacity: 0, pointerEvents: 'none' }}
          fontWeight={fontWeight}
        >
          {text}
        </text>
        
        {ready && (
          <text 
            fontWeight={fontWeight} 
            xmlSpace="preserve" 
            className={className}
            fill={gradientColors && gradientColors.length >= 2 ? `url(#${gradientId})` : undefined}
            style={{ willChange: 'startOffset' }}
          >
            <textPath ref={textPathRef} href={`#${pathId}`} startOffset={offset + 'px'} xmlSpace="preserve">
              {totalText}
            </textPath>
          </text>
        )}
      </svg>
    </div>
  );
};

export default CurvedLoop;
