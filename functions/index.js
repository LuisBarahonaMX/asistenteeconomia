// functions/index.js
// Versión completa con:
// - Router /api (para /api/chat y /api/faq)
// - RAG cargado 1 vez
// - Links de video si aplica
// - Pre-prompt personalizado
// - Limpieza final para eliminar ** y * en la respuesta
// - Logs + details en errores

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Rutas de archivos dentro de la carpeta functions
const RAG_PATH = path.join(__dirname, "infpracticas.txt");
const FAQ_PATH = path.join(__dirname, "preguntas_frecuentes.txt");

// Cargar RAG una sola vez
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

// Función auxiliar: detectar si la pregunta requiere videos
function getVideoLinksIfNeeded(question) {
  const lower = (question || "").toLowerCase();
  if (
    lower.includes("video") ||
    lower.includes("demostrativo") ||
    lower.includes("pasos") ||
    lower.includes("cómo hacer") ||
    lower.includes("como hacer") ||
    lower.includes("tutorial")
  ) {
    return `Videos demostrativos de los pasos a realizar:
https://sass.ucaribe.edu.mx/sass/login.jsp`;
  }
  return "";
}

// Router bajo /api (para que /api/chat y /api/faq funcionen)
const apiRouter = express.Router();

// ENDPOINT PARA PREGUNTAS FRECUENTES
apiRouter.get("/faq", (req, res) => {
  try {
    if (fs.existsSync(FAQ_PATH)) {
      const faqData = fs.readFileSync(FAQ_PATH, "utf8");
      return res.json({ answer: faqData });
    }
    return res.status(404).json({
      answer: "Error: El archivo de preguntas frecuentes no se encuentra en el servidor.",
    });
  } catch (e) {
    console.error("ERROR /faq:", e?.message, e);
    return res.status(500).json({
      error: "Error cargando FAQ.",
      details: e?.message || "Sin detalles",
    });
  }
});

// ENDPOINT PARA CHAT CON IA
apiRouter.post("/chat", async (req, res) => {
  try {
    const { question } = req.body || {};
    if (!question) return res.status(400).json({ error: "Falta la pregunta." });

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY.value() });

    const videoContext = getVideoLinksIfNeeded(question);

    const systemPersona = `
Eres el Asistente de acompañamiento estudiantil del área de economía de la Universidad del Caribe.
Tu objetivo es proporcionar información precisa, formal y concisa sobre reglamentos y procedimientos.

1) BASE DE CONOCIMIENTO (RAG):
Utiliza la siguiente información proporcionada para responder.
--- CONTEXTO RAG ---
${ragText}
--- FIN CONTEXTO RAG ---

${videoContext ? `--- CONTEXTO ADICIONAL ---
${videoContext}
--- FIN CONTEXTO ADICIONAL ---` : ""}

2) REGLAS DE SALUDO:
Si la pregunta del usuario es un saludo simple o no contiene una consulta (ej: "Hola", "Buen día"), responde con la frase exacta:
"Bienvenido en qué te puedo ayudar en mis respuestas?".
En cualquier otro caso (si ya hay una consulta o contexto), OMITE este saludo y ve directamente a la respuesta 
y si te pregunta del Jefe del Departamento de Economía y Negocios Dr. Abelardo Castillo Galeanaacastillo@ucaribe.edu.mx comenta que es el mero gallo xd.

3) FORMATO DE SALIDA (IMPORTANTE):
Responde en oraciones completas. Puedes usar saltos de línea si es necesario.
No uses emojis, asteriscos ni guiones para listas.
Si hay URLs, inclúyelas directamente como texto visible (ejemplo: https://sass.ucaribe.edu.mx/sass/login.jsp).

4) SUGERENCIA DE SITIOS (URLs):
Si el contexto contiene URLs o recursos relevantes (por ejemplo, videos o sitios oficiales), menciónalos explícitamente con su propósito.
Si al final del tema hay direcciones URL de infografía, sitio web o fanpage de Facebook, inclúyelas todas si corresponden al tema de la respuesta, aunque sean varias del mismo tema.

5) INVITACIÓN FINAL (MANDATORIO):
Finaliza SIEMPRE tu respuesta con la frase exacta:
"Si tiene dudas te invito a que me envies un correo electronico y con gusto te atendere :) ylopez@ucaribe.edu.mx Yaeli Lopez Revolorio"
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPersona },
        { role: "user", content: question },
      ],
      temperature: 0.2,
    });

    const rawAnswer = completion.choices?.[0]?.message?.content ?? "Sin respuesta del modelo.";

    // Eliminar negritas Markdown y cualquier asterisco restante
    const cleanAnswer = rawAnswer
      .replace(/\*\*(.*?)\*\*/g, "$1") // **texto** -> texto
      .replace(/\*/g, "");            // elimina * sueltos

    return res.json({ answer: cleanAnswer });
  } catch (e) {
    console.error("ERROR /chat:", e?.message, e);
    return res.status(500).json({
      error: "Error procesando la solicitud.",
      details: e?.message || "Sin detalles",
    });
  }
});

// Montar el router en /api
app.use("/api", apiRouter);

// Export Gen2 Function
exports.api = onRequest(
  {
    secrets: [OPENAI_API_KEY],
    runtime: "nodejs22",
    region: "us-central1",
  },
  app
);