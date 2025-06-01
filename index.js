require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(
  cors({
    origin: 'http://localhost:5173',
    // origin: ["https://dashboard-stream.netlify.app", "http://localhost:5173"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Helper para setar cookie com token
function setAuthCookie(res, token) {
  res.cookie("sb-access-token", token, {
    httpOnly: true,
    secure: true, // ← OBRIGATÓRIO para HTTPS (Netlify usa HTTPS)
    sameSite: "none",
    maxAge: 60 * 60 * 1000,
    path: "/",
  });
}

// Cadastro
app.post("/signup", async (req, res) => {
  const { email, password, name, phone, role } = req.body;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, name },
    },
  });

  if (authError) return res.status(400).json({ error: authError.message });

  const userId = authData.user?.id;

  const { error: dbError } = await supabase
    .from("users")
    .insert([{ id: userId, email, name, phone, role }]);

  if (dbError) return res.status(500).json({ error: dbError.message });

  res.status(201).json({ message: "Usuário criado com sucesso!" });
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return res.status(400).json({ error: error.message });

  const token = data.session?.access_token;
  if (!token) return res.status(500).json({ error: "Token não gerado." });

  setAuthCookie(res, token);

  res.json({ message: "Login bem-sucedido!", user: data.user });
  res.json({ message: "Aqui!", user: data.user });
});

// Profile
app.get("/profile", async (req, res) => {
  const token =
    req.cookies["sb-access-token"] ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido." });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(
    token
  );

  if (authError || !authData?.user) {
    return res
      .status(401)
      .json({ error: "Token inválido ou usuário não autenticado." });
  }

  const user = authData.user;

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("name, phone, role")
    .eq("id", user.id)
    .single();

  if (userError || !userData) {
    return res
      .status(404)
      .json({ error: "Usuário não encontrado na tabela users." });
  }

  res.json({
    id: user.id,
    email: user.email,
    name: userData.name,
    phone: userData.phone,
    role: userData.role,
    user_metadata: user.user_metadata,
  });
});

// Logout
app.post('/logout', (req, res) => {
  res.clearCookie('sb-access-token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/', // deve ser exatamente igual ao usado no login
  });

  res.status(200).json({ message: 'Logout realizado com sucesso' });
});

app.get("/debug/cookies", (req, res) => {
  console.log("Cookies recebidos:", req.cookies);
  res.json(req.cookies);
});


//Recuperação de senha
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "E-mail obrigatório." });
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "https://dashboard-stream.netlify.app/reset-password",
  });

  if (error) {
    return res
      .status(500)
      .json({ error: "Erro ao enviar e-mail de recuperação." });
  }

  res.status(200).json({ message: "E-mail de recuperação enviado." });
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
