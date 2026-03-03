import React, { useState, useRef } from "react";

const API_BASE =
  import.meta.env.MODE === "development"
    ? "http://127.0.0.1:5001/asistente-economia/us-central1/api"
    : "/api";;

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState({ displayName: "Estudiante", email: "demo@ucaribe.edu.mx" });
  const [narratorEnabled, setNarratorEnabled] = useState(true);
  const inputRef = useRef();

  // ✍️ Resalta URLs y convierte saltos de línea en <br/>
  const renderAnswer = (text) => {
    if (!text) return "";
    let safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let withLinks = safe.replace(
      /(https?:\/\/[^\s)]+[^\s.,;:)"\]])/gi,
      (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #10CFC9; font-weight: bold;">${url}</a>`
    );
    return withLinks.replace(/\n/g, "<br/>");
  };

  const handleAsk = async (query = question) => {
    if (!query.trim()) return;
    setLoading(true); setAnswer(""); setError("");
    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setAnswer(data.answer);
      if (narratorEnabled) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(data.answer);
        utter.lang = "es-MX";
        window.speechSynthesis.speak(utter);
      }
    } catch { setError("No se pudo conectar con el asistente."); }
    finally { setLoading(false); }
  };

  const handleFAQ = async () => {
    setLoading(true); setAnswer(""); setError("");
    try {
      const response = await fetch(`${API_BASE}/faq`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setAnswer(data.answer);
    } catch { 
      setError("Error al cargar las preguntas frecuentes. Verifica que el archivo existe."); 
    } finally { setLoading(false); }
  };

  const handleSpeak = () => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "es-MX";
    recognition.onresult = (e) => setQuestion(e.results[0][0].transcript);
    recognition.start();
  };

  return (
    <div className="app-container">
      <div className="app-content">
        <h1>Asistente de Acompañamiento Estudiantil</h1>
        <form onSubmit={(e) => { e.preventDefault(); handleAsk(); }} className="form-container">
          <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="¿En qué puedo ayudarte?" />
          <div className="form-buttons">
            <button type="submit" disabled={loading} className="btn-primary">{loading ? "Enviando..." : "Enviar"}</button>
            <button type="button" onClick={handleSpeak} className="btn-secondary">Hablar</button>
            <button type="button" onClick={handleFAQ} className="btn-orange">Preguntas Frecuentes</button>
          </div>
        </form>
        <div className="voice-controls">
          <button className={`btn-voice ${!narratorEnabled ? "active-off" : ""}`} onClick={() => { window.speechSynthesis.cancel(); setNarratorEnabled(false); }}> OFF VOZ </button>
          <button className={`btn-voice ${narratorEnabled ? "active-on" : ""}`} onClick={() => setNarratorEnabled(true)}> ON VOZ </button>
        </div>
        <div className="answer-box">
          <strong>Respuesta:</strong>
          {error ? <p style={{color: 'red'}}>{error}</p> : 
          <div dangerouslySetInnerHTML={{ __html: renderAnswer(answer) }} />}
        </div>
      </div>
    </div>
  );
}
export default App;