require("dotenv").config();
const express = require("express");
const cors = require('cors');
const cookieParser = require("cookie-parser");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: 'http://localhost:5173',     // ← frontend local
  credentials: true,                   // ← cookies e headers de autenticação
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Supabase client com ANON key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Setar cookie com token de acesso
function setAuthCookie(res, token) {
  res.cookie("sb-access-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 1000, // 1 hora
    sameSite: "lax",
    path: "/",
  });
}

// Rota de cadastro
app.post("/signup", async (req, res) => {
  const { email, password, name, phone, role } = req.body;

  // 1. Criar usuário com metadata
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, name },
    },
  });

  if (authError) return res.status(400).json({ error: authError.message });

  const userId = authData.user?.id;

  // 2. Inserir na tabela `users`
  const { error: dbError } = await supabase
    .from("users")
    .insert([{ id: userId, email, name, phone, role }]);

  if (dbError) return res.status(500).json({ error: dbError.message });

  res.status(201).json({ message: "Usuário criado com sucesso!" });
});

// Rota de login
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
});

// Rota de perfil autenticado
app.get('/profile', async (req, res) => {
  const token = req.cookies['sb-access-token'] || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  // 1. Obtém o usuário autenticado via token
  const { data: authData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authData?.user) {
    return res.status(401).json({ error: 'Token inválido ou usuário não autenticado.' });
  }

  const user = authData.user;

  // 2. Busca dados adicionais da tabela `users`
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('name, phone, role')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    return res.status(404).json({ error: 'Usuário não encontrado na tabela users.' });
  }

  // 3. Combina dados do Auth + tabela users
   res.json({
    id: user.id,
    email: user.email,
    name: userData.name,
    phone: userData.phone,
    role: userData.role,
    created_at: user.created_at,
    updated_at: user.updated_at || null,
    email_confirmed_at: user.email_confirmed_at,
    last_sign_in_at: user.last_sign_in_at,
    user_metadata: user.user_metadata,
    identities: user.identities
  });
});

// Rota de logout
app.post("/logout", (req, res) => {
  res.clearCookie("sb-access-token", { path: "/" });
  res.json({ message: "Logout efetuado" });
});

// Inicializa o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
