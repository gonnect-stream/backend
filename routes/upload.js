const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");

const router = express.Router();
const upload = multer();

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    const nomeEventoSlug = "leilao-bovino"; // ex: vindo do formulário
    const timestamp = Date.now();
    const nomeArquivo = `${nomeEventoSlug}-${timestamp}.jpg`;

    if (!file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    console.log("📦 Arquivo recebido:", {
      nome: file.originalname,
      tipo: file.mimetype,
      tamanhoKB: Math.round(file.size / 1024),
      nomePersonalizado: file.name,
    });

    const form = new FormData();
    form.append("file", file.buffer, nomeArquivo);

    if (req.body.name) {
      form.append("name", req.body.name);
    }

    const response = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1`,
      form,
      {
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          ...form.getHeaders(),
        },
      }
    );

    const thumbUrl =
      response.data.result.variants?.[0] || response.data.result.url;

    console.log("✅ Upload para Cloudflare bem-sucedido:", thumbUrl);
    res.json({ thumbUrl });
  } catch (err) {
    console.error("❌ Erro ao fazer upload para Cloudflare:");
    if (err.response?.data) {
      console.error(err.response.data);
    } else {
      console.error(err.message);
    }

    res.status(500).json({
      error: "Falha no upload para o Cloudflare.",
      details: err.response?.data || err.message,
    });
  }
});

module.exports = router;
