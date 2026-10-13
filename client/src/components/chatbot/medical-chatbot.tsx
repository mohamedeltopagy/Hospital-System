import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Stethoscope, Send, RefreshCw, AlertTriangle, Calendar,
  Mic, MicOff, Volume2, VolumeX, Bot, User, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
  isEmergency?: boolean;
  whatsappUrl?: string | null;
};

type ChatHistory = {
  role: "user" | "model";
  parts: { text: string }[];
};

// Emergency keywords in Arabic and English
const EMERGENCY_KEYWORDS = [
  "طوارئ", "اسعاف", "فوري", "خطر", "حرج",
  "نزيف شديد", "فقدان الوعي", "ضيق تنفس شديد",
  "emergency", "ambulance", "urgent", "critical",
  "severe bleeding", "unconscious", "heart attack",
  "call emergency", "go to ER", "اتصل بالطوارئ", "توجه للطوارئ"
];

function isEmergencyMessage(text: string): boolean {
  const lower = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some(k => lower.includes(k.toLowerCase()));
}

export function MedicalChatbot() {
  const isEn = typeof document !== "undefined" && document.documentElement.lang === "en";

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<ChatHistory[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Init speech synthesis
  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => {
      synthRef.current?.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

  // We rely on the second useEffect below to handle both initial load and resets

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const lang = isEn ? "en-US" : "ar-SA";
    utterance.lang = lang;
    utterance.rate = 0.95;
    utterance.pitch = 1;

    // Try to find a suitable voice
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v => v.lang.startsWith(isEn ? "en" : "ar"));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  }, [voiceEnabled, isEn]);

  const stopSpeaking = () => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  };

  const sendToAI = async (
    userText: string,
    currentHistory: ChatHistory[],
    isGreeting = false
  ) => {
    setIsLoading(true);
    try {
      // Add a long timeout of 45 seconds so the UI waits while backend silently retries
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: userText, history: currentHistory }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const reply: string = data.reply || "";
      const whatsappUrl: string | null = data.whatsappUrl || null;

      const botMsg: Message = {
        id: Date.now().toString(),
        role: "bot",
        text: reply,
        isEmergency: isEmergencyMessage(reply),
        whatsappUrl: whatsappUrl,
      };

      if (!isGreeting) {
        setMessages(prev => [...prev, botMsg]);
      } else {
        setMessages([botMsg]);
      }

      // Update conversation history
      const newHistory: ChatHistory[] = [
        ...currentHistory,
        ...(isGreeting ? [] : [{ role: "user" as const, parts: [{ text: userText }] }]),
        { role: "model" as const, parts: [{ text: reply }] },
      ];
      setHistory(newHistory);

      // Speak the response
      speak(reply);
    } catch (err) {
      const errMsg: Message = {
        id: Date.now().toString(),
        role: "bot",
        text: isEn
          ? "Sorry, I couldn't connect to the AI. Please try again."
          : "عذراً، لم أتمكن من الاتصال. يرجى المحاولة مرة أخرى.",
      };
      if (!isGreeting) setMessages(prev => [...prev, errMsg]);
      else setMessages([errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");

    await sendToAI(text, history);
  };

  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(isEn ? "Voice recognition is not supported in your browser." : "التعرف على الصوت غير مدعوم في متصفحك.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    synthRef.current?.cancel();
    const recognition = new SpeechRecognition();
    recognition.lang = isEn ? "en-US" : "ar-SA";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      // Auto-send after short delay
      setTimeout(() => {
        if (transcript.trim()) {
          const userMsg: Message = { id: Date.now().toString(), role: "user", text: transcript };
          setMessages(prev => [...prev, userMsg]);
          setInputValue("");
          sendToAI(transcript, history);
        }
      }, 300);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const resetChat = () => {
    synthRef.current?.cancel();
    recognitionRef.current?.stop();
    setMessages([]);
    setHistory([]);
    setInputValue("");
    setIsListening(false);
    setIsSpeaking(false);
    setHasStarted(false);
  };

  // Re-trigger greeting after reset
  useEffect(() => {
    if (!hasStarted && messages.length === 0) {
      setHasStarted(true);
      sendToAI(
        isEn ? "Hello, start the conversation" : "مرحبا ابدأ المحادثة",
        [],
        true
      );
    }
  }, [hasStarted]);

  return (
    <Card className="flex flex-col h-[580px] shadow-2xl shadow-primary/10 border-primary/10 overflow-hidden bg-gradient-to-b from-background to-primary/5 relative">
      {/* Header */}
      <div className="bg-gradient-to-l from-primary to-primary/80 text-primary-foreground p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full animate-pulse">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">
              {isEn ? "AI Health Assistant" : "المساعد الطبي الذكي"}
            </h3>
            <p className="text-xs text-primary-foreground/80">
              {isEn ? "Powered by Gemini AI · Text & Voice" : "مدعوم بـ Gemini AI · نص وصوت"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Voice TTS toggle */}
          <Button
            variant="ghost" size="icon"
            onClick={() => { setVoiceEnabled(v => !v); stopSpeaking(); }}
            className="text-primary-foreground hover:bg-white/20 h-9 w-9 rounded-xl"
            title={isEn ? "Toggle Voice" : "تشغيل/إيقاف الصوت"}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 opacity-60" />}
          </Button>
          <Button
            variant="ghost" size="icon"
            onClick={resetChat}
            className="text-primary-foreground hover:bg-white/20 h-9 w-9 rounded-xl"
            title={isEn ? "New Conversation" : "محادثة جديدة"}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex items-end gap-2 max-w-[88%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow
                  ${msg.role === "bot"
                    ? msg.isEmergency ? "bg-destructive text-white" : "bg-primary text-white"
                    : "bg-secondary text-secondary-foreground"}`}>
                  {msg.role === "bot"
                    ? msg.isEmergency ? <AlertTriangle className="w-4 h-4" /> : <Bot className="w-4 h-4" />
                    : <User className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed
                  ${msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : msg.isEmergency
                      ? "bg-destructive/10 border border-destructive/30 text-foreground rounded-bl-none"
                      : "bg-white dark:bg-slate-800 border border-border text-foreground rounded-bl-none"}`}>
                  {msg.isEmergency && (
                    <p className="text-destructive font-bold text-xs mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {isEn ? "⚠️ URGENT" : "⚠️ عاجل"}
                    </p>
                  )}
                  <p className="whitespace-pre-line">{msg.text}</p>
                  {msg.whatsappUrl && (
                    <div className="mt-3 pt-2.5 border-t border-border/50 flex flex-col gap-2">
                      <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                        <span className="text-base">🚀</span>
                        <span>{isEn ? "Automated WhatsApp Confirmation Sent by System ✅" : "قام النظام بإرسال رسالة التأكيد تلقائياً عبر واتساب للمريض ✅"}</span>
                      </div>
                      <a
                        href={msg.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                      >
                        <span className="text-sm">📲</span>
                        {isEn ? "Open in WhatsApp App / Web" : "فتح محادثة واتساب المباشرة"}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Loading dots */}
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="flex items-end gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-border px-4 py-3 rounded-2xl rounded-bl-none shadow-sm">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Book appointment CTA if last bot message suggests booking */}
        {messages.length > 2 && !isLoading && messages[messages.length - 1]?.role === "bot" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-start ms-10"
          >
            <Link
              href="/appointments"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-semibold transition-all hover:-translate-y-0.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              {isEn ? "Book an appointment" : "احجز موعدك الآن"}
            </Link>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t border-border/50 bg-background/80 backdrop-blur-sm p-3">
        <div className="flex gap-2 items-center">
          {/* Voice input button */}
          <Button
            type="button"
            size="icon"
            variant={isListening ? "destructive" : "outline"}
            onClick={handleVoiceInput}
            className={`shrink-0 rounded-xl h-11 w-11 transition-all ${isListening ? "animate-pulse shadow-lg shadow-destructive/30" : ""}`}
            title={isEn ? "Voice input" : "إدخال صوتي"}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>

          {/* Text input */}
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={
              isListening
                ? (isEn ? "Listening..." : "جاري الاستماع...")
                : (isEn ? "Type or use the mic..." : "اكتب أو استخدم الميكروفون...")
            }
            disabled={isLoading || isListening}
            className="flex-1 rounded-xl border-2 focus-visible:border-primary/50 h-11"
          />

          {/* Stop speaking button (when TTS is active) */}
          {isSpeaking && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={stopSpeaking}
              className="shrink-0 rounded-xl h-11 w-11 text-primary border border-primary/30"
            >
              <VolumeX className="w-4 h-4" />
            </Button>
          )}

          {/* Send button */}
          <Button
            type="button"
            size="icon"
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            className="shrink-0 rounded-xl h-11 w-11 shadow-md shadow-primary/20"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        {/* Voice status indicator */}
        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 flex items-center gap-2 text-xs text-destructive font-medium justify-center"
          >
            <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
            {isEn ? "Recording... speak now" : "جاري التسجيل... تحدث الآن"}
          </motion.div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="shrink-0 bg-secondary/30 px-4 py-2 border-t border-border/30">
        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          {isEn
            ? "This AI is not a substitute for a licensed physician. For emergencies, call 123."
            : "هذا المساعد لا يُغني عن طبيب مرخص. في الطوارئ اتصل بـ 123."}
        </p>
      </div>
    </Card>
  );
}
