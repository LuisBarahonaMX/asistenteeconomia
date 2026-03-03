// server.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';

const EMBEDDING_MODEL = 'text-embedding-ada-002';
const CHAT_MODEL      = 'gpt-3.5-turbo';
const PORT            = process.env.PORT || 3333;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
app.use(cors());
app.use(express.json());

// 1) Solo .txt ahora
async function loadAndChunk() {
  const publicDir = path.join(process.cwd(), 'public');
  const files = await fs.readdir(publicDir);
  
  console.log('Archivos en public/:', files);

  const docs = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const full = path.join(publicDir, file);

    if (ext !== '.txt') {
      console.log(`  • Skip ${file} (no es .txt)`);
      continue;
    }

    const text = await fs.readFile(full, 'utf-8');
    // fragmenta cada 1000 chars con overlap de 200
    for (let i = 0; i < text.length; i += 800) {
      docs.push({
        pageContent: text.slice(i, i + 1000),
        metadata:    { source: file }
      });
      i -= 200;
    }
  }

  return docs;
}

let fragments = [], embeddings = [];
async function initEmbeddings() {
  fragments = await loadAndChunk();
  console.log(`📝 ${fragments.length} fragmentos cargados.`);

  const embResp = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: fragments.map(d => d.pageContent)
  });
  embeddings = embResp.data.map(e => e.embedding);
  console.log(`🔢 Generados ${embeddings.length} embeddings.`);
}

function cosine(a, b) {
  let dot=0, magA=0, magB=0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i]*b[i];
    magA += a[i]*a[i];
    magB += b[i]*b[i];
  }
  return dot / (Math.sqrt(magA)*Math.sqrt(magB));
}

app.post('/api/chat', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'question es requerido' });

    // 1) Embedding de la pregunta
    const qEmbResp = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: question
    });
    const qEmb = qEmbResp.data[0].embedding;

    // 2) Calcula y ordena similitudes
    const sims = fragments.map((doc, i) => ({
      score: cosine(qEmb, embeddings[i]),
      doc
    }));
    sims.sort((a, b) => b.score - a.score);

    // 3) Top-5
    const topChunks  = sims.slice(0,5).map(f => f.doc.pageContent);
    const topSources = sims.slice(0,5).map(f => f.doc.metadata.source);

    // 4) Llamada a chat
    const systemPrompt = `Eres un asistente experto en el Reglamento de Prácticas Profesionales de la Universidad del Caribe.
Debes responder de forma clara, precisa y con fundamento en el documento "infpracticas.txt".
No inventes información da una solucion de una respuesta parecida o que se consulte la pagina web de la universidad, si no encuentras la respuesta en el reglamento, indícalo.`;
    const userPrompt   = `FRAGMENTOS:\n${topChunks.join('\n---\n')}\n\nPREGUNTA:\n${question}`;

    const chatResp = await openai.chat.completions.create({
      model:    CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt }
      ]
    });

    res.json({
      answer:  chatResp.choices[0].message.content.trim(),
      sources: Array.from(new Set(topSources))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// 5) Inicializa e inicia el servidor
initEmbeddings()
  .then(() => app.listen(PORT, () => console.log(`🚀 Server en http://localhost:${PORT}`)))
  .catch(err => {
    console.error('❌ Falló inicializar embeddings:', err);
    process.exit(1);
  });

