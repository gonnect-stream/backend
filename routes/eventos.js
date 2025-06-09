// routes/eventos.js
const express = require("express");
const router = express.Router();

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// GET /api/eventos → Lista todos os eventos
router.get("/", async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let query = supabase
      .from("eventos")
      .select("*", { count: "exact" }) // conta total
      .order("data", { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (status && status !== "todos") {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.status(200).json({ eventos: data, total: count });
  } catch (err) {
    console.error("Erro ao buscar eventos:", err.message);
    res.status(500).json({ error: "Erro ao buscar eventos" });
  }
});

// DELETE /api/eventos/:id → Remove um evento pelo ID
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from("eventos")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.status(200).json({ message: "Evento deletado com sucesso." });
  } catch (err) {
    console.error("Erro ao deletar evento:", err.message);
    res.status(500).json({ error: "Erro ao deletar evento." });
  }
});


module.exports = router;
