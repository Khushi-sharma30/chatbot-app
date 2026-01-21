import React, { useState, useRef, Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Avatar from "./Avatar";

export default function App() {
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const avatarRef = useRef();

  // Backend URL
  const BACKEND_URL =
    window.location.hostname === "localhost"
      ? "http://localhost:4000"
      : "http://backend:4000"; // Docker Compose service name

  // Generate temporary userId
  const [userId, setUserId] = useState("");
  useEffect(() => {
    setUserId(`user-${Math.random().toString(36).substring(2, 10)}`);
  }, []);

  const speakText = (text) => {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    setSpokenText(text);
    setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      setSpokenText("");
      avatarRef.current?.setMouthLevel(0);
    };
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (msg) => {
    if (!msg.trim()) return;

    const newChat = [...chat, { role: "user", content: msg }];
    setChat(newChat);
    setInput("");

    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: msg }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Backend error ${res.status}: ${text}`);
      }

      const data = await res.json();
      if (!data.reply) throw new Error("Backend JSON missing 'reply'");

      const updatedChat = [...newChat, { role: "assistant", content: data.reply }];
      setChat(updatedChat);
      speakText(data.reply);
    } catch (err) {
      console.error("❌ REAL ERROR:", err);
      setChat((c) => [
        ...c,
        { role: "assistant", content: `❌ Error: ${err.message}` },
      ]);
    }
  };

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Voice recognition not supported");
      return;
    }
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => handleSend(event.results[0][0].transcript);
    recognition.start();
  };

  return (
    <div className="app-container">
      <div className="avatar-panel">
        <Canvas camera={{ position: [0, 1.5, 3], fov: 45 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <Suspense fallback={null}>
            <Avatar ref={avatarRef} speaking={speaking} spokenText={spokenText} />
          </Suspense>
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>

      <div className="chat-panel">
        <div className="chat-messages">
          {chat.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              {m.content}
            </div>
          ))}
        </div>

        <div className="chat-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
          />
          <button onClick={() => handleSend(input)}>Send</button>
          <button onClick={handleVoiceInput}>🎤</button>
        </div>

        <div className="status">{speaking ? "CMS Assist speaking..." : "Idle"}</div>
      </div>
    </div>
  );
}
