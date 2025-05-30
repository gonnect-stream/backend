require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());
app.use(cookieParser());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.post("/signup", async (req, res) => {
  const { email, password, name, phone, role } = req.body;

  // 1. Cria usuário no sistema de auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) return res.status(400).json({ error: authError.message });

  const userId = authData.user?.id;

  // 2. Insere dados adicionais na tabela `users`
  const { error: insertError } = await supabase
    .from("users")
    .insert([{ id: userId, email, name, phone, role }]);

  if (insertError) return res.status(500).json({ error: insertError.message });

  res.status(201).json({ message: "Usuário criado com sucesso!" });
});

// Set cookie helper
function setAuthCookie(res, token) {
  res.cookie("sb-access-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // use HTTPS em produção
    maxAge: 60 * 60 * 1000, // 1 hora
    sameSite: "lax",
    path: "/",
  });
}

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

  res.json({ message: "Login bem-sucedido!", user: data.user,    token: token,  });
});

// Rota protegida (usa cookie ao invés do Authorization header)
app.get("/profile", async (req, res) => {
  const token = req.cookies["sb-access-token"];

  if (!token) return res.status(401).json({ error: "Não autenticado" });

  const { data, error } = await supabase.auth.getUser(token);
  if (error) return res.status(401).json({ error: "Token inválido" });

  res.json({ user: data.user });
});

// Logout: limpa o cookie
app.post("/logout", (req, res) => {
  res.clearCookie("sb-access-token", { path: "/" });
  res.json({ message: "Logout efetuado" });
});

app.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, phone, role } = req.body;

  const { error } = await supabase
    .from("users")
    .update({ name, phone, role })
    .eq("id", id);

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: "Usuário atualizado com sucesso!" });
});

app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  // 1. Deleta da tabela `users`
  const { error: dbError } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (dbError) return res.status(400).json({ error: dbError.message });

  // 2. Deleta da autenticação (admin API)
  const adminClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ SERVICE ROLE, não ANON
  );

  const { error: authError } = await adminClient.auth.admin.deleteUser(id);

  if (authError) return res.status(500).json({ error: authError.message });

  res.json({ message: 'Usuário excluído com sucesso!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
