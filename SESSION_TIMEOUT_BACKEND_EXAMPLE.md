# כיצד להטמיע Session Timeout בצד השרתון (Backend)

## סקירה כללית
זה דוקומנטציה לכיצד ליישם את ה-session timeout גם בצד הserver, כך שתהיה אימות ממשוך לבדיקת תוקף ה-session.

---

## בדיקה בכל Request (Express.js Middleware)

```javascript
// middleware/sessionTimeout.js
const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 שעה

const checkSessionTimeout = (req, res, next) => {
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // קבל זמן התחברות מה-JWT או מה-session
  const loginTime = req.user.loginTime || req.user.iat * 1000; // iat הוא בשניות
  const currentTime = new Date().getTime();
  const elapsedTime = currentTime - loginTime;

  if (elapsedTime > SESSION_TIMEOUT) {
    return res.status(401).json({ 
      error: 'Session expired. Please log in again.' 
    });
  }

  next();
};

module.exports = checkSessionTimeout;
```

---

## שימוש ב-Routes

```javascript
// routes/orders.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const checkSessionTimeout = require('../middleware/sessionTimeout');

// שימוש ב-middleware לבדיקת session
router.get('/orders', authenticateToken, checkSessionTimeout, (req, res) => {
  // הקוד שלך כאן
  res.json({ orders: [] });
});

module.exports = router;
```

---

## עדכון ה-JWT Token ל-1 שעה

```javascript
// utils/generateToken.js
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      loginTime: new Date().getTime() // הוסף זמן התחברות
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: '1h' // token פוקע אחרי שעה אחת
    }
  );
  
  return token;
};

module.exports = generateToken;
```

---

## המלא ה-Auth Middleware

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired. Please log in again.' 
      });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

module.exports = authenticateToken;
```

---

## דוגמה של Login Endpoint

```javascript
// routes/users.js
const express = require('express');
const router = express.Router();
const generateToken = require('../utils/generateToken');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // בדוק את המשתמש בDatabase
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // בדוק את הסיסמה
    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // צור JWT token (יפוקע אחרי שעה)
    const token = generateToken(user);

    // אפשרות: שמור session בDB אם תרצה
    await Session.create({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // שעה מעכשיו
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
```

---

## ביטול Session (Logout)

```javascript
// routes/users.js
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // מחק את ה-session מה-Database
    await Session.deleteOne({ 
      userId: req.user.id,
      token: req.headers['authorization']?.split(' ')[1]
    });

    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
```

---

## Database Schema - Session Model

```javascript
// models/Session.js
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 60 * 60 * 1000) // 1 שעה מעכשיו
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// מחק sessions שתוקפו פג אוטומטית
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', sessionSchema);
```

---

## Application Entry Point - Server Setup

```javascript
// server.js
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());

// Routes
const authRoutes = require('./routes/users');
const ordersRoutes = require('./routes/orders');

app.use('/users', authRoutes);
app.use('/orders', ordersRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

// Connect to Database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log(err));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## Testing - דוגמה עם Postman

1. **POST /users/login**
   ```json
   {
     "email": "user@example.com",
     "password": "password123"
   }
   ```
   
   **Response:**
   ```json
   {
     "token": "eyJhbGciOiJIUzI1NiIs...",
     "user": {
       "id": "123",
       "email": "user@example.com"
     }
   }
   ```

2. **GET /orders** (עם Authorization Header)
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
   ```
   
   **בעת תוקף Token:**
   ```json
   { "orders": [] }
   ```
   
   **אחרי שעה:**
   ```json
   { "error": "Token expired. Please log in again." }
   ```

---

## Best Practices 🔐

1. **השתמש ב-HTTPS** בProduction כדי להגן על tokens
2. **אל תשמור Secrets ב-Git** - השתמש ב-.env
3. **יישם Rate Limiting** כדי למנוע brute force attacks
4. **בדוק את Token בכל Request** - אל תסתמוך רק על Client-side
5. **Refresh Tokens** - בעתיד, שקול להוסיף refresh token flow
6. **CORS** - בדוק את ה-CORS settings בServer

---

## Integration עם Frontend

Frontend (React) שלך כבר בטוח! אתה עוד יכול:

1. להוסיף **Refresh Token** mechanism
2. להראות **countdown timer** כמה זמן נשאר בSession
3. **לאפשר סיום Session יד** עם Logout button
4. **לשמור את Session State** ב-Context או Redux

