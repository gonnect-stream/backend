// routes/eventos.js
const express = require("express");
const router = express.Router();

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// GET /api/eventos → Lista todos os eventos
// router.get("/", async (req, res) => {
//   try {
//     const { data, error } = await supabase
//       .from("eventos")
//       .select("*")
//       .order("data", { ascending: false });

//     if (error) throw error;

//     res.status(200).json(data);
//   } catch (err) {
//     console.error("Erro ao buscar eventos:", err.message);
//     res.status(500).json({ error: "Erro ao buscar eventos" });
//   }
// });

//Listar eventos
router.get("/", async (req, res) => {
  console.log("TESTANDO A ROTA 1");

  const { status = "todos", page = 1, limit = 10 } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  const from = (pageNumber - 1) * limitNumber;
  const to = from + limitNumber - 1;

  // 🔍 Log de entrada
  console.log("📥 GET /api/eventos");
  console.log(
    "status:",
    status,
    "| page:",
    pageNumber,
    "| limit:",
    limitNumber
  );

  try {
    let query = supabase
      .from("eventos")
      .select("*", { count: "exact" })
      .order("data", { ascending: false });

    if (status && status !== "todos") {
      query = query.eq("status", status);
    }

    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) throw error;

    res.status(200).json({
      eventos: data,
      total: count,
      page: pageNumber,
      limit: limitNumber,
      totalPaginas: Math.ceil(count / limitNumber),
    });
  } catch (err) {
    console.error("❌ Erro ao buscar eventos:", err.message);
    res.status(500).json({ error: "Erro ao buscar eventos" });
  }
});

//Detalhes do eventorouter.get("/:id", async (req, res) => {
const { id } = req.params;

try {
  const { data, error } = await supabase
    .from("eventos")
    .select("*")
    .eq("id", id)
    .single(); // garante um único resultado

  if (error) throw error;

  res.status(200).json(data);
} catch (err) {
  console.error("Erro ao buscar evento por ID:", err.message);
  res.status(500).json({ error: "Erro ao buscar evento." });
}

// router.get("/", async (req, res) => {

//   const { status, page = 1, limit = 10 } = req.query;
//   const offset = (parseInt(page) - 1) * parseInt(limit);

//   try {

//     let query = supabase
//       .from("eventos")
//       .select("*", { count: "exact" })
//       .order("data", { ascending: false })
//       .range(offset, offset + parseInt(limit) - 1);

//     if (status && status !== "todos") {
//       query = query.eq("status", status);
//     }

//     const { data, error, count } = await query;

//     if (error) throw error;

//     res.status(200).json({ eventos: data, total: count });
//   } catch (err) {
//     console.error("Erro ao buscar eventos:", err.message);
//     res.status(500).json({ error: "Erro ao buscar eventos" });
//   }
// });

// DELETE /api/eventos/:id → Remove um evento pelo ID

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase.from("eventos").delete().eq("id", id);

    if (error) throw error;

    res.status(200).json({ message: "Evento deletado com sucesso." });
  } catch (err) {
    console.error("Erro ao deletar evento:", err.message);
    res.status(500).json({ error: "Erro ao deletar evento." });
  }
});

module.exports = router;
