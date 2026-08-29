import React, { useState, useEffect, useRef } from "react";
import styles from "./Support.module.css";
import { io } from "socket.io-client";
import { auth } from "../../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { API_BASE_URL, getApiUrl } from "../../../utils/apiConfig";

export default function Support() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [chatMode, setChatMode] = useState(() => {
    return localStorage.getItem("stride_chat_mode") || "ai";
  });

  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! Welcome to Stride. How can I help you today?",
      sender: "ai",
      timestamp: new Date().toISOString(),
    },
  ]);

  const socket = useRef(null);
  const chatBodyRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

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
          {
            id: Date.now(),
            text: data.text,
            sender: "admin",
            timestamp: new Date().toISOString(),
          },
        ]);
      });

      const fetchHistory = async () => {
        if (!window.supabase) return;
        const { data } = await window.supabase
          .from("chat_messages")
          .select("*")
          .eq("user_id", activeUserId)
          .order("created_at", { ascending: true });

        if (data && data.length > 0) {
          const history = data.map((m) => ({
            id: m.id,
            text: m.text,
            sender: m.sender,
            timestamp: m.created_at,
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

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen]);

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

    const systemConnectingMsg = {
      id: Date.now(),
      text: "Connecting you to a live support agent...",
      sender: "system",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, systemConnectingMsg]);

    if (window.supabase) {
      try {
        await window.supabase.from("chat_messages").insert([
          {
            user_id: activeUserId,
            user_name: currentUser?.displayName || "Guest Customer",
            text: "Hello, I need live support. (Ticket Opened)",
            sender: "user",
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (e) {
        console.error("Error saving ticket to Supabase:", e);
      }
    }

    if (!socket.current) {
      socket.current = io(API_BASE_URL);
      socket.current.emit("join-room", activeUserId);
      socket.current.on("admin-message", (data) => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: data.text,
            sender: "admin",
            timestamp: new Date().toISOString(),
          },
        ]);
      });
    }

    socket.current.emit("send-to-admin", {
      userId: activeUserId,
      userName: currentUser?.displayName || "Guest Customer",
      message: "Hello, I need live support. (Ticket Opened)",
      timestamp: new Date(),
    });
  };

  const handleExitLive = () => {
    setChatMode("ai");
    localStorage.setItem("stride_chat_mode", "ai");

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: "You are now chatting with Stride AI.",
        sender: "system",
        timestamp: new Date().toISOString(),
      },
    ]);

    if (!currentUser && socket.current) {
      socket.current.disconnect();
      socket.current = null;
    }
  };

  const handleTrackOrder = async (orderId, city) => {
    try {
      const response = await fetch(getApiUrl("/api/ai/track-order"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          userCity: city,
          userId: currentUser?.uid,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text: data.update,
            sender: "ai",
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        throw new Error(data.error || "Tracking failed");
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "I couldn't find that order. Please verify your Order ID and City.",
          sender: "ai",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    const text = inputValue.trim();
    if (!text) return;

    let activeUserId = currentUser?.uid;
    if (!activeUserId) {
      activeUserId = localStorage.getItem("stride_chat_guest_id");
    }

    const userMsg = {
      id: Date.now(),
      text,
      sender: "user",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    if (chatMode === "live") {
      if (socket.current) {
        socket.current.emit("send-to-admin", {
          userId: activeUserId,
          userName: currentUser?.displayName || "Guest",
          message: text,
          timestamp: new Date(),
        });
      }
      return;
    }

    setIsTyping(true);

    const trackPattern =
      /track\s+(?:my\s+)?order\s+(?:#?(\d+))\s+in\s+([a-zA-Z\s]+)/i;
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
          userEmail: currentUser?.email,
        }),
      });

      if (!response.ok) throw new Error("Connection failed");

      const aiMsgId = Date.now() + 1;
      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          text: "",
          sender: "ai",
          timestamp: new Date().toISOString(),
        },
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
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "Sorry, I am having trouble connecting right now. Please try again.",
          sender: "ai",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSendMessage();
  };

  return (
    <div className={styles["support-container"]}>
      {/* Simple Floating Trigger Button */}
      <button
        className={styles["floating-btn"]}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Support Chat"
      >
        <i className={`bi ${isOpen ? "bi-x-lg" : "bi-chat-dots-fill"}`}></i>
      </button>

      {/* Simple Clean Chatbox */}
      {isOpen && (
        <div className={styles["chat-window"]}>
          {/* Header */}
          <div className={styles["chat-header"]}>
            <div className={styles["header-info"]}>
              <div className={styles["header-avatar"]}>
                <i className={`bi ${chatMode === "live" ? "bi-headset" : "bi-robot"}`}></i>
                <span className={styles["status-dot"]}></span>
              </div>
              <div className={styles["header-text"]}>
                <h4>{chatMode === "live" ? "Live Support" : "Stride AI"}</h4>
                <span className={styles["header-status"]}>
                  {chatMode === "live" ? "Agent Connected" : "Typically replies instantly"}
                </span>
              </div>
            </div>

            <div className={styles["header-actions"]}>
              {chatMode === "ai" ? (
                <button
                  className={styles["agent-toggle-btn"]}
                  onClick={handleConnectLive}
                  title="Connect with Human Specialist"
                >
                  <i className="bi bi-person-fill"></i>
                  <span>Live Agent</span>
                </button>
              ) : (
                <button
                  className={styles["agent-toggle-btn"]}
                  onClick={handleExitLive}
                  title="Switch back to AI"
                >
                  <i className="bi bi-robot"></i>
                  <span>AI Mode</span>
                </button>
              )}
              <button
                className={styles["close-btn"]}
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                title="Close"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>

          {/* Messages List */}
          <div className={styles["chat-body"]} ref={chatBodyRef}>
            {messages.map((msg, idx) => {
              if (msg.sender === "system") {
                return (
                  <div key={msg.id || idx} className={styles["system-msg"]}>
                    {msg.text}
                  </div>
                );
              }

              const isUser = msg.sender === "user";
              const isAdmin = msg.sender === "admin";

              return (
                <div
                  key={msg.id || idx}
                  className={`${styles["message-wrapper"]} ${
                    isUser ? styles["user-wrapper"] : styles["bot-wrapper"]
                  }`}
                >
                  <div
                    className={`${styles["message-bubble"]} ${
                      isUser
                        ? styles["user-bubble"]
                        : isAdmin
                        ? styles["admin-bubble"]
                        : styles["bot-bubble"]
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.timestamp && (
                    <span className={styles["message-time"]}>
                      {formatTime(msg.timestamp)}
                    </span>
                  )}
                </div>
              );
            })}

            {isTyping && (
              <div className={`${styles["message-wrapper"]} ${styles["bot-wrapper"]}`}>
                <div className={`${styles["message-bubble"]} ${styles["bot-bubble"]} ${styles["typing"]}`}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>

          {/* Simple Input Bar */}
          <div className={styles["chat-footer"]}>
            <input
              type="text"
              className={styles["chat-input"]}
              placeholder="Type a message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
            />
            <button
              className={styles["send-btn"]}
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              aria-label="Send"
            >
              <i className="bi bi-send-fill"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
