const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

// 1. Cargar contenido del archivo RAG
const RAG_PATH = path.join(__dirname, "infpracticas.txt");
let ragText = "";

try {
  if (fs.existsSync(RAG_PATH)) {
    ragText = fs.readFileSync(RAG_PATH, "utf8");
    console.log("Archivo infpracticas.txt cargado correctamente para RAG.");
  } else {
    console.warn("ADVERTENCIA: Archivo infpracticas.txt no encontrado.");
  }
} catch (error) {
  console.error("ERROR al leer el archivo RAG:", error);
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Endpoint de prueba
app.get("/", (req, res) => {
  res.json({
    status: "API activa",
    time: new Date().toISOString(),
    endpoint: "/api/chat",
  });
});

// Función auxiliar: detectar si la pregunta requiere videos
function getVideoLinksIfNeeded(question) {
  const lower = question.toLowerCase();
  if (
    lower.includes("video") ||
    lower.includes("demostrativo") ||
    lower.includes("pasos") ||
    lower.includes("cómo hacer") ||
    lower.includes("tutorial")
  ) {
    return `
Videos demostrativos de los pasos a realizar:
1.- Seleccionar empresa: link URL: https://www.youtube.com/watch?v=3plfoOz1Z6o
2.- Elaboración del programa de trabajo: link URL: https://www.youtube.com/watch?v=HuGUPPQXjfM
3.- Elaboración de reportes: link URL: https://www.youtube.com/watch?v=ZVzzL-jqDsg
4.- Etapa de evaluación: link URL: https://www.youtube.com/watch?v=Cpjtg6Bg6dA
`;
  }
  return "";
}

app.post("/chat", async (req, res) => {
  try {
    const { question } = req.body || {};
    if (!question)
      return res.status(400).json({ error: "Falta la pregunta." });

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY.value() });

    // Añadir enlaces si aplica
    const videoContext = getVideoLinksIfNeeded(question);

    // **************** PROMPT DEL SISTEMA ****************
    const systemPersona = `
Eres el Asistente Profesional de Prácticas de la Universidad del Caribe. 
Tu objetivo es proporcionar información precisa, formal y concisa sobre reglamentos y procedimientos.

1. **BASE DE CONOCIMIENTO (RAG):**
Utiliza la siguiente información proporcionada para responder.
--- CONTEXTO RAG ---
${ragText}
--- FIN CONTEXTO RAG ---

${videoContext ? `--- CONTEXTO ADICIONAL ---\n${videoContext}\n--- FIN CONTEXTO ADICIONAL ---` : ""}

2. **REGLAS DE SALUDO:**
Si la pregunta del usuario es un saludo simple o no contiene una consulta (ej: "Hola", "Buen día"), responde con la frase exacta:
"Bienvenido al asistente de practicas, ¿de qué programa educativo eres y en qué te puedo ayudar en mis respuestas?".
En cualquier otro caso (si ya hay una consulta o contexto), **OMITE** este saludo largo y ve directamente a la respuesta.

3. **FORMATO DE SALIDA (IMPORTANTE):**
Responde en oraciones completas. Puedes usar saltos de línea si es necesario. 
No uses emojis, asteriscos ni guiones para listas. 
Si hay URLs, inclúyelas directamente como texto visible (ejemplo: https://unicaribe.mx/practicas-profesionales).

4. **SUGERENCIA DE SITIOS (URLs):**
Si el contexto contiene URLs o recursos relevantes (por ejemplo, videos o sitios oficiales), menciónalos explícitamente con su propósito.

5. **INVITACIÓN FINAL (MANDATORIO):**
Finaliza SIEMPRE tu respuesta con la frase exacta:
"Te invito a visitar la página de prácticas de la universidad para más información: https://unicaribe.mx/practicas-profesionales"

---
Pregunta del usuario: "${question}"
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: systemPersona }],
      temperature: 0.2,
    });

    const answer =
      completion.choices?.[0]?.message?.content || "Sin respuesta.";

    // Enviar respuesta JSON
    res.json({ answer });
  } catch (e) {
    console.error("Error /chat:", e);
    res.status(500).json({ error: "Error procesando la solicitud." });
  }
});

exports.api = onRequest({ secrets: [OPENAI_API_KEY], runtime: "nodejs20" }, app);
