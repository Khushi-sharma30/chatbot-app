import React, { useState, useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Avatar from "./Avatar";

export default function App() {
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const avatarRef = useRef();

  // Backend URL: use environment variable if available, else Docker service name
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000";



  // ------------------ Speak using browser SpeechSynthesis (LIP SYNC ENABLED) ------------------
  const speakText = (text) => {
    if (!("speechSynthesis" in window)) {
      alert("Your browser does not support speech synthesis!");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;

    setSpokenText(text);
    setSpeaking(true);

    // When speech ends
    utterance.onend = () => {
      setSpeaking(false);
      setSpokenText("");
      if (avatarRef.current) avatarRef.current.setMouthLevel(0);
    };

    window.speechSynthesis.speak(utterance);
  };

  // ------------------ Send message to backend WITH CONTEXT ------------------
  const handleSend = async (msg) => {
    if (!msg.trim()) return;

    const newChat = [...chat, { role: "user", content: msg }];
    setChat(newChat);
    setInput("");

    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newChat }),
      });

      const data = await res.json();
      const botText = data.reply;

      const updatedChat = [...newChat, { role: "assistant", content: botText }];
      setChat(updatedChat);

      speakText(botText);
    } catch (err) {
      console.error(err);
      setChat((c) => [
        ...c,
        { role: "assistant", content: "Something went wrong." },
      ]);
    }
  };

  // ------------------ Voice input ------------------
  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Your browser does not support voice recognition.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      handleSend(spokenText);
    };

    recognition.start();
  };

  return (
    <div className="app-container">
      {/* AVATAR PANEL */}
      <div className="avatar-panel">
        <Canvas camera={{ position: [0, 1.5, 3], fov: 45 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <Suspense fallback={null}>
            <Avatar
              ref={avatarRef}
              speaking={speaking}
              spokenText={spokenText}
            />
          </Suspense>
          <OrbitControls enablePan={false} />
        </Canvas>
      </div>

      {/* CHAT PANEL */}
      <div className="chat-panel">
        <div className="chat-messages">
          {chat.map((m, i) => (
            <div
              key={i}
              className={`message ${m.role === "user" ? "user" : "bot"}`}
            >
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
          <button onClick={handleVoiceInput}>🎤 Speak</button>
        </div>

        <div className="status">{speaking ? "Khushi is speaking..." : "Idle"}</div>
      </div>
    </div>
  );
}
