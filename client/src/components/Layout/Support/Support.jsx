import React, { useState, useEffect, useRef } from "react";
import styles from "./Support.module.css";
import { io } from "socket.io-client";
import { auth } from "../../../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { API_BASE_URL, getApiUrl } from "../../../utils/apiConfig";

export default function Support() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const socket = useRef(null);

  useEffect(() => {
    if (currentUser) {
      socket.current = io(API_BASE_URL);
      
      socket.current.emit("join-room", currentUser.uid);

      socket.current.on("admin-message", (data) => {
        setMessages((prev) => [
          ...prev, 
          { id: Date.now(), text: data.text, sender: "admin" }
        ]);
      });

      // Fetch history from Supabase
      const fetchHistory = async () => {
        if (!window.supabase) return;
        const { data } = await window.supabase
          .from("chat_messages")
          .select("*")
          .eq("user_id", currentUser.uid)
          .order("created_at", { ascending: true });

        if (data && data.length > 0) {
          const history = data.map(m => ({
            id: m.id,
            text: m.text,
            sender: m.sender
          }));
          // Merge with initial message
          setMessages((prev) => [prev[0], ...history]);
        }
      };
      fetchHistory();

      return () => {
        if (socket.current) socket.current.disconnect();
      };
    }
  }, [currentUser]);

  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi buddy! 👋 Welcome to Stride. How can I help you find the perfect pair of sneakers today?",
      sender: "ai",
    },
  ]);

  const chatBodyRef = useRef(null);
  const wrapperRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isMenuOpen &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isMenuOpen]);

  const handleToggle = () => {
    if (isChatOpen) {
      setIsChatOpen(false);
      return;
    }
    setIsMenuOpen(!isMenuOpen);
  };

  const handleOpenChat = (e) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

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
          { id: Date.now() + 1, text: data.update, sender: "ai" },
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
          text: "I couldn't find that order. Please double-check your Order ID and City.",
          sender: "ai",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    const text = inputValue.trim();
    if (!text) return;

    // 1. Add user message
    const userMsg = { id: Date.now(), text, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    // Send to Socket (for Live Admin)
    if (socket.current) {
      socket.current.emit("send-to-admin", {
        userId: currentUser?.uid,
        userName: currentUser?.displayName || "Guest",
        message: text,
        timestamp: new Date()
      });
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
      // 3. API Call (Streaming)
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

      // 4. Create an empty AI message to fill
      const aiMsgId = Date.now() + 1;
      setMessages((prev) => [
        ...prev,
        { id: aiMsgId, text: "", sender: "ai" },
      ]);
      setIsTyping(false); // Hide "thinking" once streaming starts

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
                // Update the specific message by its ID
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
          text: "Error: Could not reach the server. Make sure your local backend is running.",
          sender: "ai",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSendMessage();
  };

  // Hide the floating wrapper button entirely on mobile if chat is open to prevent overlapping
  const isMobile = window.innerWidth <= 576;
  const hideWrapper = isChatOpen && isMobile;

  return (
    <>
      <div
        ref={wrapperRef}
        className={`${styles["support-widget-wrapper"]} ${isMenuOpen ? styles.open : ""}`}
        id="supportWidgetWrapper"
        style={{ display: hideWrapper ? "none" : "flex" }}
      >
        <button
          className={styles["support-toggle-btn"]}
          onClick={handleToggle}
          aria-label="Support"
        >
          <i
            className={`bi ${isChatOpen || isMenuOpen ? "bi-x-lg" : "bi-chat-dots-fill"}`}
          ></i>
        </button>

        <div className={styles["support-menu"]}>
          <button
            className={styles["support-option-btn"]}
            aria-label="AI Assistant"
            onClick={handleOpenChat}
          >
            <i className={`bi bi-robot ${styles["icon-ai"]}`}></i>
          </button>
          <a
            href="https://wa.me/1234567890"
            target="_blank"
            rel="noreferrer"
            className={styles["support-option-btn"]}
            aria-label="WhatsApp Us"
          >
            <i className={`bi bi-whatsapp ${styles["icon-whatsapp"]}`}></i>
          </a>
        </div>
      </div>

      <div
        className={`${styles["ai-chatbox"]} ${isChatOpen ? styles.active : ""}`}
      >
        <div className={styles["chatbox-header"]}>
          <div className={styles["chatbox-title-container"]}>
            <i className="bi bi-robot"></i>
            <div className={styles["chatbox-title"]}>
              <strong>Stride AI</strong>
              <span>Typically replies instantly</span>
            </div>
          </div>
          <button
            className={styles["chatbox-close-btn"]}
            onClick={handleCloseChat}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className={styles["chatbox-body"]} ref={chatBodyRef}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles["chat-msg"]} ${msg.sender === "user" ? styles["msg-user"] : styles["msg-ai"]}`}
            >
              {msg.text}
            </div>
          ))}
          {isTyping && (
            <div
              className={`${styles["chat-msg"]} ${styles["msg-ai"]} ${styles["msg-typing"]}`}
            >
              Thinking...
            </div>
          )}
        </div>

        <div className={styles["chatbox-input-area"]}>
          <input
            type="text"
            className={styles["chatbox-input"]}
            placeholder="Type your message..."
            autoComplete="off"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button
            className={styles["chatbox-send-btn"]}
            onClick={handleSendMessage}
          >
            <i className="bi bi-send-fill"></i>
          </button>
        </div>
      </div>
    </>
  );
}
