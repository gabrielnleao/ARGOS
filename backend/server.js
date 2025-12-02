// server.js
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Conta fixa
const FIXED_USER = {
  email: "op@argos.com",
  password: "123456", // troque depois por uma senha forte
  name: "Operador ARGOS",
};

app.use(cors());
app.use(express.json());

app.post("/login", (req, res) => {
  const { email, password } = req.body || {};

  if (email === FIXED_USER.email && password === FIXED_USER.password) {
    const token = "token-simples-exemplo";
    return res.json({
      token,
      user: {
        name: FIXED_USER.name,
        email: FIXED_USER.email,
      },
    });
  }

  return res.status(401).json({ error: "Credenciais inválidas" });
});

app.listen(PORT, () => {
  console.log(`Servidor de login rodando em http://localhost:${PORT}`);
});
