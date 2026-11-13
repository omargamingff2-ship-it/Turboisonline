require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// تقديم الملفات الثابتة من مجلد public
app.use(express.static(path.join(__dirname, 'public')));

// رابط التوجيه إلى صفحة تفويض ديسكورد
app.get('/login', (req, res) => {
    const scopes = encodeURIComponent('identify rpc.activities.write');
    const redirectUri = encodeURIComponent(process.env.REDIRECT_URI);
    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&scope=${scopes}`;
    
    res.redirect(discordAuthUrl);
});

// مسار استقبال الكود بعد موافقة المستخدم (Callback)
app.get('/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('لم يتم استلام رمز التفويض من ديسكورد.');
    }

    try {
        // 1. استبدال الكود بـ Access Token
        const tokenResponse = await axios.post(
            'https://discord.com/api/oauth2/token',
            new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.REDIRECT_URI,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const accessToken = tokenResponse.data.access_token;

        // 2. جلب بيانات حساب المستخدم باستخدام التوكن
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const user = userResponse.data;
        const avatarUrl = user.avatar 
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` 
            : 'https://cdn.discordapp.com/embed/avatars/0.png';

        // 3. عرض صفحة نجاح مخصصة ببيانات المستخدم
        res.send(`
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>تم الربط بنجاح</title>
                <style>
                    body { background-color: #1e1f22; color: #fff; font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .card { background-color: #2b2d31; padding: 35px; border-radius: 14px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.4); width: 320px; }
                    img { width: 90px; height: 90px; border-radius: 50%; border: 3px solid #5865F2; margin-bottom: 15px; }
                    h2 { margin: 0 0 8px; font-size: 22px; }
                    p { color: #b5bac1; font-size: 14px; margin-bottom: 20px; }
                    .badge { background: #23a559; color: white; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="card">
                    <img src="${avatarUrl}" alt="Avatar">
                    <h2>أهلاً، ${user.global_name || user.username}</h2>
                    <p>ID: ${user.id}</p>
                    <span class="badge">✓ تم تفويض البوت بنجاح</span>
                </div>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('OAuth Error:', error.response?.data || error.message);
        res.status(500).send('حدث خطأ أثناء التحقق من الحساب، تأكد من صحة إعدادات التطبيق.');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
