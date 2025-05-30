require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use(cors({
  origin: 'https://dashboard-stream.netlify.app',
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Helper para setar cookie com token
function setAuthCookie(res, token) {
  res.cookie('sb-access-token', token, {
    httpOnly: true,
    secure: false, // em produção: true com HTTPS
    sameSite: 'lax',
    maxAge: 60 * 60 * 1000,
    path: '/'
  });
}

// Cadastro
app.post('/signup', async (req, res) => {
  const { email, password, name, phone, role } = req.body;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, name }
    }
  });

  if (authError) return res.status(400).json({ error: authError.message });

  const userId = authData.user?.id;

  const { error: dbError } = await supabase
    .from('users')
    .insert([{ id: userId, email, name, phone, role }]);

  if (dbError) return res.status(500).json({ error: dbError.message });

  res.status(201).json({ message: 'Usuário criado com sucesso!' });
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return res.status(400).json({ error: error.message });

  const token = data.session?.access_token;
  if (!token) return res.status(500).json({ error: 'Token não gerado.' });

  setAuthCookie(res, token);

  res.json({ message: 'Login bem-sucedido!', user: data.user });
});

// Profile
app.get('/profile', async (req, res) => {
  const token = req.cookies['sb-access-token'] || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authData?.user) {
    return res.status(401).json({ error: 'Token inválido ou usuário não autenticado.' });
  }

  const user = authData.user;

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('name, phone, role')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    return res.status(404).json({ error: 'Usuário não encontrado na tabela users.' });
  }

  res.json({
    id: user.id,
    email: user.email,
    name: userData.name,
    phone: userData.phone,
    role: userData.role,
    user_metadata: user.user_metadata
  });
});

// Logout
app.post('/logout', (req, res) => {
  res.clearCookie('sb-access-token', {
    path: '/',
    sameSite: 'lax',
    secure: false // true em produção com HTTPS
  });
  res.json({ message: 'Logout efetuado' });
});


// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
