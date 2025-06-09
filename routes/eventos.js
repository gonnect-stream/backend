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
  try {
    const { data, error } = await supabase
      .from("eventos")
      .select("*")
      .order("data", { ascending: false });

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error("Erro ao buscar eventos:", err.message);
    res.status(500).json({ error: "Erro ao buscar eventos" });
  }
});

module.exports = router;
