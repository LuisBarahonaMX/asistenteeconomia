import React, { useState, useRef, useEffect } from "react";

const API_BASE =
  import.meta.env.MODE === "development"
    ? "http://127.0.0.1:5001/asistente-economia/us-central1/api"
    : "/api";

const STORAGE_KEY = "asistente_practicas_historial";

function App() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [narratorEnabled, setNarratorEnabled] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const renderAnswer = (text) => {
    if (!text) return "";

    let safe = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    let withLinks = safe.replace(
      /(https?:\/\/[^\s)]+[^\s.,;:)"\]])/gi,
      (url) =>
        `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#1A1449;font-weight:700;text-decoration:underline;">${url}</a>`
    );

    return withLinks.replace(/\n/g, "<br/>");
  };

  const handleAsk = async (query = question) => {
    if (!query.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });

      if (!response.ok) throw new Error();

      const data = await response.json();
      const botAnswer = data.answer || "No se recibió respuesta.";

      const newEntry = {
        question: query,
        answer: botAnswer,
        timestamp: new Date().toISOString(),
      };

      setHistory((prev) => [...prev, newEntry]);
      setQuestion("");

      if (narratorEnabled) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(botAnswer);
        utter.lang = "es-MX";
        window.speechSynthesis.speak(utter);
      }
    } catch {
      setError("No se pudo conectar con el asistente.");
    } finally {
      setLoading(false);
    }
  };

  const handleFAQ = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/faq`);
      if (!response.ok) throw new Error();

      const data = await response.json();
      const faqAnswer = data.answer || "No se encontraron preguntas frecuentes.";

      const newEntry = {
        question: "Preguntas frecuentes",
        answer: faqAnswer,
        timestamp: new Date().toISOString(),
      };

      setHistory((prev) => [...prev, newEntry]);
    } catch {
      setError(
        "Error al cargar las preguntas frecuentes. Verifica que el archivo existe."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("El navegador no soporta reconocimiento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.onresult = (e) => setQuestion(e.results[0][0].transcript);
    recognition.start();
  };

  const handleClearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
    setQuestion("");
    setError("");
    window.speechSynthesis.cancel();
  };

  return (
    <div className="app-container">
      <div className="app-content">
        <h1>Asistente de Acompañamiento Estudiantil</h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="form-container"
        >
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="¿En qué puedo ayudarte?"
          />

          <div className="form-buttons">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Enviando..." : "Enviar"}
            </button>

            <button
              type="button"
              onClick={handleSpeak}
              className="btn-secondary"
              disabled={loading}
            >
              Hablar
            </button>

            <button
              type="button"
              onClick={handleFAQ}
              className="btn-orange"
              disabled={loading}
            >
              Preguntas Frecuentes
            </button>
          </div>
        </form>

        <div className="voice-controls">
          <button
            className="btn-voice btn-clear-history"
            onClick={handleClearHistory}
            disabled={loading}
          >
            Borrar historial de chat
          </button>

          <button
            className="btn-voice btn-disable-voice"
            onClick={() => setNarratorEnabled((prev) => !prev)}
            disabled={loading}
          >
            {narratorEnabled ? "Voz activada" : "Desactivar voz"}
          </button>
        </div>

        <div className="answer-box">
          <strong>Historial de conversación:</strong>

          {error ? (
            <p className="error-text">{error}</p>
          ) : history.length === 0 ? (
            <p className="empty-text">
              Aún no hay consultas registradas. Escribe una pregunta para comenzar.
            </p>
          ) : (
            <div className="history-list">
              {history
                .slice()
                .reverse()
                .map((item, index) => (
                  <div key={`${item.timestamp}-${index}`} className="history-item">
                    <div className="history-question">
                      <strong>Pregunta:</strong> {item.question}
                    </div>
                    <div
                      className="history-answer"
                      dangerouslySetInnerHTML={{
                        __html: renderAnswer(item.answer),
                      }}
                    />
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;