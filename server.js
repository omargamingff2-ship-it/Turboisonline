require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const mongoose = require("mongoose");

const {
  CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, COOKIE_SECRET,
  PORT = 3000, MONGO_URI
} = process.env;

const API = "https://discord.com/api/v10";

// الاتصال بقاعدة بيانات MongoDB تلقائياً
mongoose.connect(MONGO_URI || "mongodb://Gojocat-newuser1:9pcvtGac@ac-bmcspcl-shard-00-00.wfkfa3z.mongodb.net:27017,ac-bmcspcl-shard-00-01.wfkfa3z.mongodb.net:27017,ac-bmcspcl-shard-00-02.wfkfa3z.mongodb.net:27017/?ssl=true&replicaSet=atlas-yfnau8-shard-0&authSource=admin&compressors=zlib", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("Connected to MongoDB!")).catch(err => console.error(err));

// تعريف نموذج البيانات
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  username: { type: String },
  avatar: { type: String },
  email: { type: String }
});
const usersData = mongoose.model("datadbs", userSchema);

const app = express();
app.use(cookieParser(COOKIE_SECRET));

const page = (body) => `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Halloween Authentication - KEO</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: linear-gradient(135deg, #120d1a 0%, #1f0c24 50%, #08060a 100%);
      background-size: 400% 400%;
      animation: spookyBg 15s ease infinite;
      color: #e0def4;
      font-family: 'Tajawal', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    @keyframes spookyBg {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    /* تأثيرات خلفية الهالووين المتحركة */
    .halloween-bg {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      overflow: hidden;
      pointer-events: none;
      z-index: 1;
    }
    .glow-orb {
      position: absolute;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(255, 107, 0, 0.12) 0%, transparent 70%);
      border-radius: 50%;
      animation: floatOrb 10s ease-in-out infinite alternate;
    }
    .glow-orb:nth-child(2) {
      top: 60%; left: 70%;
      background: radial-gradient(circle, rgba(138, 43, 226, 0.12) 0%, transparent 70%);
      animation-duration: 14s;
    }
    @keyframes floatOrb {
      0% { transform: translateY(0) scale(1); }
      100% { transform: translateY(-40px) scale(1.1); }
    }
    /* المستطيل الخاص بالموقع */
    .card {
      position: relative;
      z-index: 2;
      background: rgba(20, 15, 28, 0.85);
      backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 107, 0, 0.25);
      border-radius: 20px;
      padding: 40px 35px;
      text-align: center;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 25px rgba(255, 107, 0, 0.15);
      animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .avatar {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      border: 3px solid #ff6b00;
      object-fit: cover;
      box-shadow: 0 0 20px rgba(255, 107, 0, 0.4);
      margin-bottom: 16px;
    }
    .username {
      font-size: 22px;
      font-weight: 700;
      color: #f3f0ff;
      margin-bottom: 12px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }
    .status-badge {
      color: #ff9f43;
      font-size: 14px;
      font-weight: 500;
      background: rgba(255, 159, 67, 0.08);
      border: 1px solid rgba(255, 159, 67, 0.2);
      padding: 8px 18px;
      border-radius: 30px;
      margin-bottom: 25px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    /* التوقيع بخط رفيع جداً */
    .developer-sig {
      font-size: 10px;
      font-weight: 300;
      color: rgba(255, 255, 255, 0.35);
      letter-spacing: 2px;
      text-transform: uppercase;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 15px;
      width: 100%;
    }
  </style>
</head>
<body>
  <div class="halloween-bg">
    <div class="glow-orb" style="top: 10%; left: 15%;"></div>
    <div class="glow-orb"></div>
  </div>
  <div class="card">${body}</div>
</body>
</html>`;

// الصفحة الرئيسية
app.get("/", async (req, res) => {
  const uid = req.signedCookies.uid;
  if (!uid) return res.redirect("/login");

  const userDoc = await usersData.findOne({ id: uid });
  if (!userDoc) return res.redirect("/login");

  res.send(page(`
    <img class="avatar" src="${userDoc.avatar}" alt="Avatar">
    <div class="username">${userDoc.username}</div>
    <div class="status-badge">
      🎃 تم ربط الحساب بنجاح و يعمل في الظلام...
    </div>
    <div class="developer-sig">
      made by syrian devloper : keo
    </div>
  `));
});

// تحويل لديسكورد
app.get("/login", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie("state", state, { signed: true, httpOnly: true, maxAge: 600000 });
  const url = new URL("https://discord.com/oauth2/authorize");
  url.search = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: "identify",
    state,
  });
  res.redirect(url);
});

// رجوع ديسكورد بعد الموافقة وحفظ البيانات
app.get("/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || state !== req.signedCookies.state) return res.status(400).send("طلب غير صالح");
  res.clearCookie("state");

  const tr = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI,
    }),
  });
  const tok = await tr.json();
  if (!tok.access_token) {
    console.error("فشل تبادل الكود:", tok);
    return res.status(400).send(`فشل: ${JSON.stringify(tok)}`);
  }

  const ur = await fetch(`${API}/users/@me`, {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  });
  const user = await ur.json();

  const avatarUrl = user.avatar 
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` 
    : `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator || 0) % 5}.png`;

  await usersData.findOneAndUpdate(
    { id: user.id },
    {
      id: user.id,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      username: user.global_name || user.username,
      avatar: avatarUrl,
      email: user.email || null
    },
    { upsert: true, new: true }
  );

  res.cookie("uid", user.id, { signed: true, httpOnly: true, maxAge: 30 * 864e5 });
  res.redirect("/");
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
