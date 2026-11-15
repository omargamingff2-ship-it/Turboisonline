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
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      /* خلفية المحارب الذي يمسك علم */
      background: linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('https://i.pinimg.com/736x/87/40/e6/8740e608034c264a935beee2e0435df2.jpg') no-repeat center center fixed;
      background-size: cover;
      color: #dbdee1;
      font-family: 'Tajawal', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    .card {
      background: rgba(43, 45, 49, 0.88);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 35px 30px;
      text-align: center;
      max-width: 550px;
      width: 92%;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
      animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .main-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      width: 100%;
      margin-bottom: 25px;
    }
    /* مربع الفارس الذي يحمل التاج (على اليسار) */
    .knight-box {
      width: 75px;
      height: 75px;
      border-radius: 14px;
      border: 2px solid rgba(88, 101, 242, 0.6);
      object-fit: cover;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
      flex-shrink: 0;
    }
    /* قسم صورة المستخدم واسمه (على اليمين) */
    .user-profile-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;
      width: 80px;
    }
    .avatar {
      width: 65px;
      height: 65px;
      border-radius: 50%;
      border: 2px solid #57f287;
      object-fit: cover;
      box-shadow: 0 0 15px rgba(87, 242, 135, 0.3);
      margin-bottom: 6px;
    }
    .username {
      font-size: 13px;
      font-weight: 700;
      color: #f2f3f5;
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    /* المحتوى الأوسط (الرسالة والزر) */
    .center-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .message-box {
      font-size: 14px;
      font-weight: 700;
      color: #57f287;
      margin-bottom: 16px;
      background: rgba(87, 242, 135, 0.08);
      padding: 10px 14px;
      border-radius: 12px;
      border: 1px solid rgba(87, 242, 135, 0.2);
      line-height: 1.5;
      width: 100%;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #5865f2;
      color: #fff;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      padding: 12px 18px;
      border-radius: 12px;
      transition: all 0.25s ease;
      box-shadow: 0 4px 14px rgba(88, 101, 242, 0.4);
      width: 100%;
    }
    .btn:hover {
      background: #4752c4;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(88, 101, 242, 0.6);
    }
    /* توقيع المطور بخط رفيع جداً في الأسفل */
    .developer-sig {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 10px;
      font-weight: 300;
      color: rgba(255, 255, 255, 0.35);
      letter-spacing: 1.5px;
      text-transform: uppercase;
      width: 100%;
      text-align: center;
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
    <div class="main-row">
      <!-- على الشمال: الفارس الذي يحمل التاج -->
      <img class="knight-box" src="https://i.pinimg.com/736x/87/40/e6/8740e608034c264a935beee2e0435df2.jpg" alt="Knight">
      
      <!-- في المنتصف: النص والزر -->
      <div class="center-content">
        <div class="message-box">
          تم يباشا حسابك انربط و بيصير اونلاين دائما 😉
        </div>

        <a class="btn" href="https://discord.gg/mnm" target="_blank">
          <svg style="width:18px;height:18px;fill:#ffffff;" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          انضم للسيرفر
        </a>
      </div>

      <!-- على اليمين: صورة بروفايل الشخص وتحتها اسمه -->
      <div class="user-profile-box">
        <img class="avatar" src="${userDoc.avatar}" alt="Avatar">
        <div class="username" title="${userDoc.username}">${userDoc.username}</div>
      </div>
    </div>

    <!-- توقيع المطور بخط رفيع في الأسفل -->
    <div class="developer-sig">
      BY SYRIAN DEVLOPER:KEO
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
