import React, { useState, useEffect, useRef } from "react";
import styles from "./Support.module.css";
import { io } from "socket.io-client";
import { auth } from "../../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { API_BASE_URL, getApiUrl } from "../../../utils/apiConfig";

export default function Support() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [chatMode, setChatMode] = useState(() => {
    return localStorage.getItem("stride_chat_mode") || "ai";
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const socket = useRef(null);

  useEffect(() => {
    let activeUserId = currentUser?.uid;
    if (!activeUserId) {
      activeUserId = localStorage.getItem("stride_chat_guest_id");
      if (!activeUserId && chatMode === "live") {
        activeUserId = "guest_" + Math.random().toString(36).substring(2, 11);
        localStorage.setItem("stride_chat_guest_id", activeUserId);
      }
    }

    if (activeUserId && chatMode === "live") {
      socket.current = io(API_BASE_URL);
      
      socket.current.emit("join-room", activeUserId);

      socket.current.on("admin-message", (data) => {
        setMessages((prev) => [
          ...prev, 
          { id: Date.now(), text: data.text, sender: "admin", timestamp: new Date().toISOString() }
        ]);
      });

      // Fetch history from Supabase
      const fetchHistory = async () => {
        if (!window.supabase) return;
        const { data } = await window.supabase
          .from("chat_messages")
          .select("*")
          .eq("user_id", activeUserId)
          .order("created_at", { ascending: true });

        if (data && data.length > 0) {
          const history = data.map(m => ({
            id: m.id,
            text: m.text,
            sender: m.sender,
            timestamp: m.created_at
          }));
          setMessages((prev) => [prev[0], ...history]);
        }
      };
      fetchHistory();

      return () => {
        if (socket.current) {
          socket.current.disconnect();
          socket.current = null;
        }
      };
    }
  }, [currentUser, chatMode]);

  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! Welcome to Stride Concierge. How can I assist you with sneakers, sizes, or orders today?",
      sender: "ai",
      timestamp: new Date().toISOString()
    },
  ]);

  const formatDividerDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const options = { weekday: "short", month: "short", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleConnectLive = async () => {
    let activeUserId = currentUser?.uid;
    if (!activeUserId) {
      activeUserId = localStorage.getItem("stride_chat_guest_id");
      if (!activeUserId) {
        activeUserId = "guest_" + Math.random().toString(36).substring(2, 11);
        localStorage.setItem("stride_chat_guest_id", activeUserId);
      }
    }

    setChatMode("live");
    localStorage.setItem("stride_chat_mode", "live");

    const ticketRequestMsg = {
      id: Date.now(),
      text: "I would like to speak with a human support agent.",
      sender: "user",
      timestamp: new Date().toISOString()
    };

    const systemConnectingMsg = {
      id: Date.now() + 1,
      text: "Live support ticket opened. Connecting with a Stride specialist...",
      sender: "system",
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, ticketRequestMsg, systemConnectingMsg]);

    if (window.supabase) {
      try {
        await window.supabase.from("chat_messages").insert([
          {
            user_id: activeUserId,
            user_name: currentUser?.displayName || "Guest Customer",
            text: "Hello, I need live support. (Ticket Opened)",
            sender: "user",
            created_at: new Date().toISOString()
          }
        ]);
      } catch (e) {
        console.error("Error saving ticket message to Supabase:", e);
      }
    }

    if (!socket.current) {
      socket.current = io(API_BASE_URL);
      socket.current.emit("join-room", activeUserId);
      
      socket.current.on("admin-message", (data) => {
        setMessages((prev) => [
          ...prev, 
          { id: Date.now(), text: data.text, sender: "admin", timestamp: new Date().toISOString() }
        ]);
      });
    }

    socket.current.emit("send-to-admin", {
      userId: activeUserId,
      userName: currentUser?.displayName || "Guest Customer",
      message: "Hello, I need live support. (Ticket Opened)",
      timestamp: new Date()
    });
  };

  const handleExitLive = () => {
    setChatMode("ai");
    localStorage.setItem("stride_chat_mode", "ai");

    const systemExitMsg = {
      id: Date.now(),
      text: "You are now chatting with Stride AI Concierge.",
      sender: "system",
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, systemExitMsg]);

    if (!currentUser && socket.current) {
      socket.current.disconnect();
      socket.current = null;
    }
  };

  const chatBodyRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleTrackOrder = async (orderId, city) => {
    try {
      const response = await fetch(getApiUrl("/api/ai/track-order"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          orderId, 
          userCity: city,
          userId: currentUser?.uid 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, text: data.update, sender: "ai", timestamp: new Date().toISOString() },
        ]);
      } else {
        throw new Error(data.error || "Tracking failed");
      }
    } catch (error) {
      console.error("Tracking Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "I couldn't find that order. Please verify your Order ID and City.",
          sender: "ai",
          timestamp: new Date().toISOString()
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessageWithText = async (textToSend) => {
    const text = textToSend.trim();
    if (!text) return;

    let activeUserId = currentUser?.uid;
    if (!activeUserId) {
      activeUserId = localStorage.getItem("stride_chat_guest_id");
    }

    // 1. Add user message
    const userMsg = { id: Date.now(), text, sender: "user", timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    if (chatMode === "live") {
      if (socket.current) {
        socket.current.emit("send-to-admin", {
          userId: activeUserId,
          userName: currentUser?.displayName || "Guest",
          message: text,
          timestamp: new Date()
        });
      }
      return;
    }

    // 2. Show thinking state
    setIsTyping(true);

    // Check for "Track Order" command
    const trackPattern = /track\s+(?:my\s+)?order\s+(?:#?(\d+))\s+in\s+([a-zA-Z\s]+)/i;
    const match = text.match(trackPattern);

    if (match) {
      const orderId = match[1];
      const city = match[2].trim();
      await handleTrackOrder(orderId, city);
      return;
    }

    try {
      const response = await fetch(getApiUrl("/api/chat/ask"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: text,
          userId: currentUser?.uid,
          userEmail: currentUser?.email
        }),
      });

      if (!response.ok) throw new Error("Connection failed");

      const aiMsgId = Date.now() + 1;
      setMessages((prev) => [
        ...prev,
        { id: aiMsgId, text: "", sender: "ai", timestamp: new Date().toISOString() },
      ]);
      setIsTyping(false);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (dataStr === "[DONE]") break;

            try {
              const json = JSON.parse(dataStr);
              if (json.content) {
                fullText += json.content;
                setMessages((prev) => 
                  prev.map((msg) => 
                    msg.id === aiMsgId ? { ...msg, text: fullText } : msg
                  )
                );
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error("Fetch error connecting to AI backend:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "Sorry, I am having trouble connecting right now. Please try again in a moment.",
          sender: "ai",
          timestamp: new Date().toISOString()
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = () => {
    sendMessageWithText(inputValue);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSendMessage();
  };

  const quickPrompts = [
    { icon: "bi-lightning-charge", label: "Best Running Shoes", prompt: "Recommend the best running sneakers currently available in store." },
    { icon: "bi-box-seam", label: "Track My Order", prompt: "How can I track my order status?" },
    { icon: "bi-fire", label: "Trending Drops", prompt: "What are the latest shoe releases and trending sneakers?" },
    { icon: "bi-rulers", label: "Sizing Guide", prompt: "How do shoe sizes fit for Nike, Adidas and Puma at Stride?" },
  ];

  return (
    <>
      {/* Floating Modern Launcher Pill */}
      {!isChatOpen && (
        <button
          className={styles["support-pill-launcher"]}
          onClick={() => setIsChatOpen(true)}
          aria-label="Open Stride Assistant"
        >
          <div className={styles["launcher-icon-box"]}>
            <i className="bi bi-chat-heart-fill"></i>
            <span className={styles["launcher-status-dot"]}></span>
          </div>
          <div className={styles["launcher-label"]}>
            <strong>Stride Concierge</strong>
            <span>Online</span>
          </div>
        </button>
      )}

      {/* Modern Streetwear Concierge Chat Window */}
      <div
        className={`${styles["concierge-window"]} ${isChatOpen ? styles.active : ""}`}
      >
        {/* Top Luxury Header */}
        <div className={styles["concierge-header"]}>
          <div className={styles["header-brand-info"]}>
            <div className={styles["concierge-avatar"]}>
              <span>S</span>
              <span className={styles["avatar-online-ring"]}></span>
            </div>
            <div className={styles["concierge-titles"]}>
              <div className={styles["concierge-name-row"]}>
                <h3>Stride Concierge</h3>
                <span className={styles["badge-mode"]}>
                  {chatMode === "live" ? "Live Agent" : "AI"}
                </span>
              </div>
              <p>
                {chatMode === "live"
                  ? "Connected with human specialist"
                  : "24/7 Footwear & Order Assistant"}
              </p>
            </div>
          </div>

          <div className={styles["header-nav-actions"]}>
            <a
              href="https://wa.me/1234567890"
              target="_blank"
              rel="noreferrer"
              className={styles["header-icon-link"]}
              title="Chat on WhatsApp"
            >
              <i className="bi bi-whatsapp"></i>
            </a>

            <button
              type="button"
              className={styles["header-close-btn"]}
              onClick={() => setIsChatOpen(false)}
              title="Close chat"
              aria-label="Close"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        {/* Mode Switcher Tab Bar */}
        <div className={styles["mode-tab-bar"]}>
          <button
            type="button"
            className={`${styles["mode-tab-item"]} ${chatMode === "ai" ? styles["tab-active"] : ""}`}
            onClick={chatMode === "live" ? handleExitLive : undefined}
          >
            <i className="bi bi-cpu"></i>
            <span>AI Concierge</span>
          </button>

          <button
            type="button"
            className={`${styles["mode-tab-item"]} ${chatMode === "live" ? styles["tab-active"] : ""}`}
            onClick={chatMode === "ai" ? handleConnectLive : undefined}
          >
            <i className="bi bi-headset"></i>
            <span>Human Specialist</span>
          </button>
        </div>

        {/* Messages Body */}
        <div className={styles["concierge-body"]} ref={chatBodyRef}>
          {/* Welcome Card */}
          {messages.length <= 1 && (
            <div className={styles["welcome-card"]}>
              <div className={styles["welcome-badge"]}>
                <i className="bi bi-stars"></i> Instant Sneaker Help
              </div>
              <h4>Welcome to Stride Concierge</h4>
              <p>
                Ask about shoe recommendations, sizing, materials, or track an existing order.
              </p>
            </div>
          )}

          {messages.map((msg, idx, arr) => {
            if (msg.sender === "system") {
              return (
                <div key={msg.id || idx} className={styles["msg-system-pill"]}>
                  <i className="bi bi-info-circle-fill"></i>
                  <span>{msg.text}</span>
                </div>
              );
            }

            const prevMsg = arr[idx - 1];
            const showDateDivider = msg.timestamp && (
              !prevMsg || 
              !prevMsg.timestamp || 
              new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString()
            );

            const isUser = msg.sender === "user";
            const isAdmin = msg.sender === "admin";

            return (
              <React.Fragment key={msg.id || idx}>
                {showDateDivider && (
                  <div className={styles["date-divider"]}>
                    <span>{formatDividerDate(msg.timestamp)}</span>
                  </div>
                )}

                <div
                  className={`${styles["msg-row"]} ${
                    isUser ? styles["msg-row-user"] : styles["msg-row-bot"]
                  }`}
                >
                  {!isUser && (
                    <div className={styles["bot-mini-avatar"]}>
                      <i className={`bi ${isAdmin ? "bi-person-badge-fill" : "bi-cpu"}`}></i>
                    </div>
                  )}

                  <div className={styles["msg-content-wrapper"]}>
                    <div
                      className={`${styles["bubble"]} ${
                        isUser
                          ? styles["bubble-user"]
                          : isAdmin
                          ? styles["bubble-admin"]
                          : styles["bubble-bot"]
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.timestamp && (
                      <span className={styles["bubble-time"]}>
                        {formatTime(msg.timestamp)}
                      </span>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className={`${styles["msg-row"]} ${styles["msg-row-bot"]}`}>
              <div className={styles["bot-mini-avatar"]}>
                <i className="bi bi-cpu"></i>
              </div>
              <div className={styles["typing-indicator-box"]}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          {/* Suggested Quick Prompt Chips */}
          {messages.length <= 2 && !isTyping && chatMode === "ai" && (
            <div className={styles["prompts-section"]}>
              <span className={styles["prompts-title"]}>Popular Questions</span>
              <div className={styles["prompts-grid"]}>
                {quickPrompts.map((chip, cIdx) => (
                  <button
                    key={cIdx}
                    type="button"
                    className={styles["prompt-chip"]}
                    onClick={() => sendMessageWithText(chip.prompt)}
                  >
                    <i className={`bi ${chip.icon}`}></i>
                    <span>{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Composer */}
        <div className={styles["concierge-composer"]}>
          <div className={styles["composer-box"]}>
            <input
              type="text"
              className={styles["composer-input"]}
              placeholder={
                chatMode === "live"
                  ? "Message human support agent..."
                  : "Ask anything about shoes, sizing, orders..."
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              autoComplete="off"
            />
            <button
              type="button"
              className={styles["composer-send-btn"]}
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              title="Send Message"
            >
              <i className="bi bi-arrow-up"></i>
            </button>
          </div>
          <div className={styles["composer-footer-note"]}>
            <span>⚡ Powered by Stride AI Engine</span>
          </div>
        </div>
      </div>
    </>
  );
}
