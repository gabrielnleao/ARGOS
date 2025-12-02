module.exports = (req, res) => {
  // Só aceita POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { email, password } = req.body || {};

  // Conta fixa (pode virar variável de ambiente na Vercel)
  const FIXED_EMAIL = process.env.FIXED_USER_EMAIL || "op@argos.com";
  const FIXED_PASSWORD = process.env.FIXED_USER_PASSWORD || "123456";
  const FIXED_NAME = process.env.FIXED_USER_NAME || "Operador ARGOS";

  if (email === FIXED_EMAIL && password === FIXED_PASSWORD) {
    const token = "token-simples-exemplo";
    res.status(200).json({
      token,
      user: {
        name: FIXED_NAME,
        email: FIXED_EMAIL,
      },
    });
  } else {
    res.status(401).json({ error: "Credenciais inválidas" });
  }
};