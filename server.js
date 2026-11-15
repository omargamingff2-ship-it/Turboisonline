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
  <title>ربط الحساب - Discord Authentication</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #1e1f22;
      background-image: 
        radial-gradient(at 10% 20%, rgba(88, 101, 242, 0.15) 0px, transparent 50%),
        radial-gradient(at 90% 80%, rgba(87, 242, 135, 0.1) 0px, transparent 50%);
      color: #dbdee1;
      font-family: 'Tajawal', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .card {
      background: #2b2d31;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 20px;
      padding: 40px 32px;
      text-align: center;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
      animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .avatar {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      border: 4px solid #5865f2;
      object-fit: cover;
      margin: 0 auto 16px auto;
      box-shadow: 0 0 20px rgba(88, 101, 242, 0.4);
    }
    .username {
      font-size: 24px;
      font-weight: 800;
      color: #f2f3f5;
      margin-bottom: 6px;
    }
    .success {
      color: #57f287;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 24px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(87, 242, 135, 0.08);
      padding: 4px 14px;
      border-radius: 20px;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: #5865f2;
      color: #fff;
      text-decoration: none;
      font-size: 16px;
      font-weight: 700;
      padding: 16px 24px;
      border-radius: 12px;
      transition: all 0.25s ease;
      box-shadow: 0 4px 14px rgba(88, 101, 242, 0.4);
    }
    .btn:hover {
      background: #4752c4;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(88, 101, 242, 0.6);
    }
    .btn:active {
      transform: translateY(0);
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
    <div class="success">
      <svg style="width:14px;height:14px;fill:#57f287;" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
      تم ربط الحساب بنجاح
    </div>
    <a class="btn" href="https://discord.gg/mnm" target="_blank">
      <!-- أيقونة الأعضاء المماثلة لطلبك -->
      <svg style="width:24px;height:24px;fill:#ffffff;" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
      انضم للسيرفر
    </a>
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

  // جلب رابط صورة الحساب بشكل صحيح
  const avatarUrl = user.avatar 
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` 
    : `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator || 0) % 5}.png`;

  // حفظ بيانات المستخدم في قاعدة البيانات
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