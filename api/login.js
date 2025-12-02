// api/login.js
const { Pool } = require("pg");

// Pool reutilizável entre chamadas (bom para serverless)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // necessário para Supabase
  },
});

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email e senha são obrigatórios." });
    }

    // Ajuste o nome da tabela/colunas se for diferente
    const query = `
      SELECT id, name, email, password
      FROM users
      WHERE email = $1
      LIMIT 1
    `;

    const { rows } = await pool.query(query, [email]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    // Comparação simples de senha (sem hash, só para protótipo)
    if (user.password !== password) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    // Aqui você poderia gerar um JWT real
    const token = "token-simples-exemplo";

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name || "Operador ARGOS",
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Erro no /api/login:", err);
    return res.status(500).json({ error: "Erro interno no servidor." });
  }
};
