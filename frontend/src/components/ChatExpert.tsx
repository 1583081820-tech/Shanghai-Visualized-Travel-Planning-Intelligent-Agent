// src/components/ChatExpert.tsx
import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { askShanghaiExpert } from "../lib/chatExpert";
import { cn } from "../utils/cn";
import { 
  Send, 
  Sparkles, 
  Trash2, 
  Compass, 
  Cpu, 
  Globe, 
  Database, 
  HelpCircle,
  Loader2,
  CheckCircle2
} from "lucide-react";

type ChatMessage = {
  role: "user" | "expert";
  content: string;
  source?: "internet" | "local" | "both"; // 信息来源
  mode?: "fast" | "agent"; // 使用的模式
  usedTools?: string[]; // 使用的工具列表
  isDegraded?: boolean; // 是否超时降级
  timestamp: string;
};

interface ChatExpertProps {
  dark?: boolean;
  initialQuestion?: string;
  onBackToLanding?: () => void;
}

export default function ChatExpert({ 
  dark: _dark = true, 
  initialQuestion = "", 
  onBackToLanding 
}: ChatExpertProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [chatMode, setChatMode] = useState<'auto' | 'fast' | 'agent'>('fast'); // 聊天模式
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动平滑滚动
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, statusMessage]);

  // 核心发问逻辑
  const onSend = useCallback(async (questionText?: string) => {
    const question = (questionText || input).trim();
    if (!question || loading) return;

    const currentTime = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

    // 添加用户消息
    setMessages(prev => [...prev, { role: "user", content: question, timestamp: currentTime }]);
    setInput("");
    setLoading(true);
    setStatusMessage("⚡ 正在获取双引擎通道许可...");

    // 添加专家空消息
    setMessages(prev => [...prev, { role: "expert", content: "", timestamp: currentTime }]);

    try {
      const generator = askShanghaiExpert(question, chatMode);
      let fullContent = "";
      
      for await (const chunk of generator) {
        // 捕捉思考状态更新
        if (chunk.startsWith("🔍") || chunk.startsWith("🌐") || chunk.startsWith("📚") || 
            chunk.startsWith("⚡") || chunk.startsWith("🧠") || chunk.startsWith("🤖") ||
            chunk.startsWith("🔧")) {
          setStatusMessage(chunk.replace("\n", ""));
          continue;
        }

        // 处理清除序列
        if (chunk.includes("\x1B[1A\x1B[K")) {
          const clearCount = (chunk.match(/\x1B\[1A\x1B\[K/g) || []).length;
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            let content = lastMessage.content;
            const lines = content.split("\n");
            content = lines.slice(0, -clearCount).join("\n");
            return [...prev.slice(0, -1), { ...lastMessage, content }];
          });
          setStatusMessage("");
          continue;
        }

        fullContent += chunk;
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage.role === "expert") {
            // 自动识别信息来源和模式
            let source: ChatMessage["source"] = undefined;
            let mode: ChatMessage["mode"] = undefined;
            let usedTools: string[] = [];
            let isDegraded = false;

            if (fullContent.includes("互联网最新信息 + 上海本地知识库")) {
              source = "both";
            } else if (fullContent.includes("互联网最新信息")) {
              source = "internet";
            } else if (fullContent.includes("上海本地知识库") || fullContent.includes("RAG")) {
              source = "local";
            }

            // 识别模式
            if (fullContent.includes("【快速模式】") || fullContent.includes("快速模式")) {
              mode = "fast";
            } else if (fullContent.includes("【Agent 智能模式】") || fullContent.includes("Agent模式")) {
              mode = "agent";
            }

            // 识别超时降级
            if (fullContent.includes("【超时降级】") || fullContent.includes("超时降级")) {
              isDegraded = true;
            }

            // 识别使用的工具
            const toolMatch = fullContent.match(/使用工具[：:]\s*(.+)/);
            if (toolMatch) {
              usedTools = toolMatch[1].split(/[、,，]/).map(t => t.trim()).filter(Boolean);
            }

            return [
              ...prev.slice(0, -1),
              { ...lastMessage, content: fullContent, source, mode, usedTools, isDegraded }
            ];
          }
          return prev;
        });
      }
    } catch (err) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { 
          role: "expert", 
          content: `❌ 回答失败，请检查网络连接：${(err as Error).message}`,
          timestamp: currentTime 
        }
      ]);
    } finally {
      setLoading(false);
      setStatusMessage("");
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [input, loading, chatMode]);

  // 监听并发送初始问题
  useEffect(() => {
    if (initialQuestion) {
      onSend(initialQuestion);
    }
  }, [initialQuestion, onSend]);

  // 清空聊天并返回
  const clearChat = () => {
    setMessages([]);
    if (onBackToLanding) {
      onBackToLanding();
    }
  };

  // 快捷问题列表（带图标）
  const quickQuestions = [
    { text: "上海现在穿什么衣服？", icon: "🧥" },
    { text: "外滩最新灯光秀时间？", icon: "🌃" },
    { text: "迪士尼可以带食物吗？", icon: "🏰" },
    { text: "上海地铁怎么买票？", icon: "🚇" }
  ];

const renderFormattedContent = (text: string) => {
  if (!text) return null;

  // 统一处理行内**加粗
  const processInlineBold = (str: string): ReactNode => {
    const parts = str.split(/\*\*(.*?)\*\*/g);
    if (parts.length === 1) return str;
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="text-indigo-200 font-medium">{part}</strong>;
      }
      return part;
    });
  };

  return text.split("\n").map((line, idx) => {
    // 三级标题
    if (line.startsWith("### ")) {
      return (
        <h4 key={idx} className="text-base font-semibold text-indigo-300 mt-3 mb-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full inline-block"></span>
          {processInlineBold(line.substring(4))}
        </h4>
      );
    }

    // **标题**: 内容 格式
    const titleMatch = line.match(/^\s*[-*•]?\s*\*\*(.*?)\*\*(.*)$/);
    if (titleMatch) {
      return (
        <div key={idx} className="my-1.5 leading-relaxed">
          <strong className="text-slate-100 font-semibold bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-900/40 mr-1 text-sm">
            {titleMatch[1]}
          </strong>
          <span className="text-slate-300 text-sm">{processInlineBold(titleMatch[2])}</span>
        </div>
      );
    }

    // 无序列表
    if (line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
      return (
        <div key={idx} className="flex items-start gap-2 my-1 pl-1">
          <span className="text-indigo-400 mt-1.5 text-xs">•</span>
          <span className="text-slate-300 text-sm flex-1">
            {processInlineBold(line.trim().slice(2))}
          </span>
        </div>
      );
    }

    // 有序列表
    const numMatch = line.match(/^\s*(\d+)\.\s*(.*)$/);
    if (numMatch) {
      return (
        <div key={idx} className="flex items-start gap-2 my-1 pl-1">
          <span className="text-indigo-400 font-bold text-xs mt-1">{numMatch[1]}.</span>
          <span className="text-slate-300 text-sm flex-1">
            {processInlineBold(numMatch[2])}
          </span>
        </div>
      );
    }

    // 空行
    if (line.trim() === "") {
      return <div key={idx} className="h-2" />;
    }

    // 普通段落
    return (
      <p key={idx} className="text-slate-300 text-sm leading-relaxed my-0.5">
        {processInlineBold(line)}
      </p>
    );
  });
};
  return (
    <div className={cn(
      "flex flex-col h-full bg-slate-900/40 backdrop-blur-2xl border rounded-3xl overflow-hidden shadow-2xl transition-all duration-500",
      loading ? "animate-apple-glow border-indigo-500/30" : "border-white/5"
    )}>
      {/* 顶部状态条 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Compass className="w-5.5 h-5.5 text-white animate-spin-slow" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-sm animate-pulse" />
          </div>
            <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-semibold text-white tracking-wide font-artistic">申城智能文旅专家</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                V3.5 Pro
              </span>
              {/* 技术栈标签 */}
              <div className="flex items-center gap-1 ml-1">
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-800/60 text-slate-300 border border-slate-700/50 backdrop-blur-sm">
                  LangChain
                </span>
                <span className="text-[8px] text-slate-600">+</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-800/60 text-slate-300 border border-slate-700/50 backdrop-blur-sm">
                  FAISS
                </span>
                <span className="text-[8px] text-slate-600">+</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-800/60 text-slate-300 border border-slate-700/50 backdrop-blur-sm">
                  对话记忆
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
              双引擎实时在线咨询已就绪
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 模式切换 */}
          <div className="flex items-center bg-white/5 rounded-lg border border-white/5 p-0.5">
            <button
              onClick={() => setChatMode('fast')}
              className={cn(
                "px-2.5 py-1 text-[10px] rounded-md transition-all duration-200 flex items-center gap-1",
                chatMode === 'fast' 
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
              title="快速模式：基于RAG知识库，响应更快"
            >
              <span>⚡</span>
              <span>快速</span>
            </button>
            <button
              onClick={() => setChatMode('auto')}
              className={cn(
                "px-2.5 py-1 text-[10px] rounded-md transition-all duration-200 flex items-center gap-1",
                chatMode === 'auto' 
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
              title="智能模式：自动判断复杂度，平衡速度与智能"
            >
              <span>🧠</span>
              <span>智能</span>
            </button>
            <button
              onClick={() => setChatMode('agent')}
              className={cn(
                "px-2.5 py-1 text-[10px] rounded-md transition-all duration-200 flex items-center gap-1",
                chatMode === 'agent' 
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
              title="Agent模式：多工具自主调度，更智能但稍慢"
            >
              <span>🤖</span>
              <span>Agent</span>
            </button>
          </div>

          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg border border-white/5 hover:border-rose-500/20 transition-all duration-300 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空记录
          </button>
        </div>
      </div>

      {/* 快捷问题横向流动区 */}
      <div className="px-6 py-3 border-b border-white/5 bg-slate-950/20">
        <div className="text-[11px] font-medium text-slate-400 mb-2 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          继续提问推荐词
        </div>
        <div className="flex flex-wrap gap-2 max-h-[76px] overflow-y-auto custom-scrollbar">
          {quickQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => onSend(q.text)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-xl bg-white/5 hover:bg-indigo-600/20 text-slate-300 hover:text-white border border-white/5 hover:border-indigo-500/30 transition-all duration-300 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 shadow-sm"
            >
              <span>{q.icon}</span>
              <span>{q.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 聊天消息流 */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scroll-smooth custom-scrollbar"
        style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.02) 0%, transparent 80%)' }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3.5 max-w-[88%] transition-all duration-500 animate-fadeIn",
              msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            {/* 头像 */}
            <div className={cn(
              "w-8.5 h-8.5 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-md",
              msg.role === "user" 
                ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white" 
                : "bg-slate-800 border border-slate-700 text-indigo-400"
            )}>
              {msg.role === "user" ? "U" : "AI"}
            </div>

            {/* 消息体 */}
            <div className="space-y-1.5 flex-1">
              {/* 信息来源及昵称头部 */}
              <div className={cn(
                "flex items-center gap-2 text-[10px] text-slate-400",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}>
                <span className="font-medium">{msg.role === "user" ? "游客" : "上海智能文旅专家"}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>

                {msg.role === "expert" && msg.source && (
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-medium ml-1 backdrop-blur-sm",
                    msg.source === "internet" && "bg-blue-500/15 text-blue-300 border-blue-500/25",
                    msg.source === "local" && "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
                    msg.source === "both" && "bg-purple-500/15 text-purple-300 border-purple-500/25"
                  )}>
                    {msg.source === "internet" && <Globe className="w-2.5 h-2.5" />}
                    {msg.source === "local" && <Database className="w-2.5 h-2.5" />}
                    {msg.source === "both" && (
                      <>
                        <Globe className="w-2.5 h-2.5" />
                        <span className="text-[8px] opacity-70">+</span>
                        <Database className="w-2.5 h-2.5" />
                      </>
                    )}
                    <span className="font-medium">
                      {msg.source === "internet" && "实时联网"}
                      {msg.source === "local" && "文旅知识库"}
                      {msg.source === "both" && "双引擎检索"}
                    </span>
                  </div>
                )}

                {/* 模式标签 */}
                {msg.role === "expert" && msg.mode && (
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-medium backdrop-blur-sm",
                    msg.mode === "fast" && "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
                    msg.mode === "agent" && "bg-violet-500/15 text-violet-300 border-violet-500/25"
                  )}>
                    <span className="text-[10px]">{msg.mode === "fast" ? "⚡" : "🤖"}</span>
                    <span className="font-medium">
                      {msg.mode === "fast" && "快速模式"}
                      {msg.mode === "agent" && "Agent模式"}
                    </span>
                  </div>
                )}

                {/* 超时降级标签 */}
                {msg.role === "expert" && msg.isDegraded && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-medium scale-95 origin-left bg-amber-500/10 text-amber-300 border-amber-500/20">
                    <span>⏰</span>
                    <span>超时降级</span>
                  </div>
                )}

                {/* 工具使用标签 */}
                {msg.role === "expert" && msg.usedTools && msg.usedTools.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap ml-1">
                    {msg.usedTools.slice(0, 3).map((tool, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-medium bg-cyan-500/10 text-cyan-300 border-cyan-500/20 backdrop-blur-sm"
                      >
                        <span>🔧</span>
                        <span>{tool}</span>
                      </div>
                    ))}
                    {msg.usedTools.length > 3 && (
                      <div className="px-1.5 py-0.5 rounded-md border text-[9px] font-medium bg-slate-500/10 text-slate-400 border-slate-500/20">
                        +{msg.usedTools.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 聊天气泡 */}
              <div
                className={cn(
                  "rounded-2xl px-5 py-3.5 text-sm transition-all shadow-xl leading-relaxed",
                  msg.role === "user"
                    ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-indigo-600/15 border border-indigo-500/20"
                    : "bg-slate-900/60 text-slate-200 rounded-tl-none border border-slate-800/80 backdrop-blur-md"
                )}
              >
                <div className="space-y-1.5">
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <>
                      {/* 如果内容为空且处于正在回答状态，显示打字光标 */}
                      {msg.content === "" && loading && i === messages.length - 1 ? (
                        <div className="flex items-center gap-2 py-1.5 text-indigo-300 font-light text-xs animate-pulse">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                          <span>正在融合申城文旅局最佳建议...</span>
                        </div>
                      ) : (
                        renderFormattedContent(msg.content)
                      )}
                      
                      {/* 打字机光标效果 */}
                      {loading && i === messages.length - 1 && msg.role === "expert" && msg.content !== "" && (
                        <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-400 animate-pulse rounded-full align-middle" />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* 动态系统搜索状态 */}
        {statusMessage && (
          <div className="flex items-center gap-2.5 text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-900/30 px-4 py-3 rounded-2xl max-w-[fit-content] animate-pulse">
            <Cpu className="w-4.5 h-4.5 text-indigo-400 animate-spin-slow" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* 底部输入框 */}
      <div className="p-5 border-t border-white/5 bg-slate-950/40">
        <div className="flex gap-2.5 items-center">
          <div className="relative flex-1 group">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && onSend()}
              disabled={loading}
              className="w-full h-12 rounded-xl border border-white/5 bg-slate-900/70 hover:bg-slate-900 px-5 pr-12 text-sm text-slate-100 placeholder-slate-500 shadow-inner outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-950/50 transition-all duration-300 disabled:opacity-50"
              placeholder="请输入您的上海旅游疑问，例如：“豫园门票多少钱？”"
            />
            <div className="absolute right-4 top-3.5 text-slate-500 group-hover:text-slate-400 pointer-events-none transition-colors">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          
          <button
            onClick={() => onSend()}
            disabled={loading || !input.trim()}
            className={cn(
              "h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-5 text-sm font-medium shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-1.5 transition-all duration-300 transform active:scale-95 disabled:scale-100 disabled:opacity-40 disabled:cursor-not-allowed",
              "cursor-pointer"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>计算中</span>
              </>
            ) : (
              <>
                <span>发送</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
        <div className="mt-2 text-[10px] text-center text-slate-500 flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-slate-600" />
          <span>上海文旅数据库2026年最新修订版已默认加载 • 支持AI推理和流式渲染</span>
        </div>
      </div>
    </div>
  );
}
