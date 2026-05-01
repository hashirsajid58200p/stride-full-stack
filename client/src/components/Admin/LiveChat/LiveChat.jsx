import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import styles from "./LiveChat.module.css";

export default function LiveChat() {
  const [activeUsers, setActiveUsers] = useState({}); // { userId: { name, messages: [] } }
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const socket = useRef(null);

  useEffect(() => {
    // 1. Fetch History from Supabase
    const fetchHistory = async () => {
      if (!window.supabase) return;
      const { data, error } = await window.supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (data) {
        const grouped = {};
        data.forEach((m) => {
          if (!grouped[m.user_id]) {
            grouped[m.user_id] = { name: m.user_name || "Valued Customer", messages: [] };
          }
          grouped[m.user_id].messages.push({
            text: m.text,
            sender: m.sender,
            timestamp: m.created_at,
          });
        });
        setActiveUsers(grouped);
      }
    };
    fetchHistory();

    // 2. Initialize Sockets
    socket.current = io("http://localhost:5000");

    socket.current.on("new-customer-message", (data) => {
      setActiveUsers((prev) => {
        const user = prev[data.userId] || { name: data.userName, messages: [] };
        return {
          ...prev,
          [data.userId]: {
            ...user,
            name: data.userName || user.name, // Update name if provided
            messages: [...user.messages, { text: data.message, sender: "user", timestamp: data.timestamp }],
          },
        };
      });
    });

    socket.current.on("admin-message", (data) => {
      // This listener is mostly for the user side, but here we can use it to sync multiple admin tabs if needed.
    });

    return () => {
      if (socket.current) socket.current.disconnect();
    };
  }, []);

  const handleSendReply = () => {
    if (!selectedUserId || !replyText.trim()) return;

    const messageData = {
      userId: selectedUserId,
      message: replyText,
    };

    socket.current.emit("send-to-user", messageData);

    // Update UI immediately (socket will save to DB on server side)
    setActiveUsers((prev) => {
      const user = prev[selectedUserId];
      return {
        ...prev,
        [selectedUserId]: {
          ...user,
          messages: [...user.messages, { text: replyText, sender: "admin", timestamp: new Date() }],
        },
      };
    });

    setReplyText("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h3>Active Chats</h3>
          <span className={styles.chatCount}>{Object.keys(activeUsers).length}</span>
        </div>
        <div className={styles.userList}>
          {Object.keys(activeUsers).length === 0 && (
            <div className={styles.noChats}>
              <i className="bi bi-chat-left-dots"></i>
              <p>No chat history found</p>
              <span>New messages will appear here</span>
            </div>
          )}
          {Object.entries(activeUsers).map(([id, user]) => (
            <div
              key={id}
              className={`${styles.userItem} ${selectedUserId === id ? styles.active : ""}`}
              onClick={() => setSelectedUserId(id)}
            >
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userLastMsg}>
                  {user.messages[user.messages.length - 1]?.text.substring(0, 30)}...
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.chatArea}>
        {selectedUserId ? (
          <>
            <div className={styles.chatHeader}>
              Chatting with {activeUsers[selectedUserId].name}
            </div>
            <div className={styles.messageList}>
              {activeUsers[selectedUserId].messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`${styles.message} ${
                    msg.sender === "admin" ? styles.admin : msg.sender === "ai" ? styles.ai : styles.user
                  }`}
                >
                  <div className={styles.msgBubble}>{msg.text}</div>
                  <span className={styles.msgTime}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.inputArea}>
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendReply()}
                placeholder="Type a reply..."
              />
              <button onClick={handleSendReply}>Send</button>
            </div>
          </>
        ) : (
          <div className={styles.placeholder}>Select a customer to view conversation</div>
        )}
      </div>
    </div>
  );
}
