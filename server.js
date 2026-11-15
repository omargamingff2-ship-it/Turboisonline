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
      /* خلفية هالووين حقيقية (القمر العملاق واليقطين والجو المرعب) */
      background: linear-gradient(rgba(10, 5, 20, 0.5), rgba(10, 5, 20, 0.65)), 
                  url('https://images.unsplash.com/photo-1509557965875-b88c97052f0e?q=80&w=1920&auto=format&fit=crop') no-repeat center center fixed;
      background-size: cover;
      color: #e0def4;
      font-family: 'Tajawal', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    /* المستطيل الأنيق في المنتصف */
    .card {
      position: relative;
      z-index: 2;
      background: rgba(20, 14, 28, 0.88);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 107, 0, 0.3);
      border-radius: 22px;
      padding: 40px 35px;
      text-align: center;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(255, 107, 0, 0.2);
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
      border: 3px solid #ff7b00;
      object-fit: cover;
      box-shadow: 0 0 20px rgba(255, 123, 0, 0.5);
      margin-bottom: 16px;
    }
    .username {
      font-size: 22px;
      font-weight: 700;
      color: #f3f0ff;
      margin-bottom: 12px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.6);
    }
    .status-badge {
      color: #ff9f43;
      font-size: 14px;
      font-weight: 500;
      background: rgba(255, 159, 67, 0.1);
      border: 1px solid rgba(255, 159, 67, 0.25);
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
      color: rgba(255, 255, 255, 0.4);
      letter-spacing: 2px;
      text-transform: uppercase;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 15px;
      width: 100%;
    }
  </style>
</head>
<body>
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
      🎃 تم ربط الحساب بنجاح ويعمل دائماً...
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
