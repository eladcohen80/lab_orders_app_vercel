# תיעוד: Session Timeout - חד שעה אוטומטי

## סקירה כללית
הוסיף מנגנון session timeout שמבצע logout אוטומטי של המשתמש אחרי שעה אחת של התחברות.

## שינויים שנעשו

### 1. Login.tsx
**קובץ:** `lab_orders_client/src/components/Login.tsx`

#### הוספות:
- **SESSION_TIMEOUT**: קבוע שמגדיר זמן timeout של 60 דקות (60 * 60 * 1000 מילישניות)
- **tokenExpiration**: שמירה של זמן הexpiration של הטוקן ב-localStorage
- **handleLogout()**: פונקציה שמבצעת logout ומנקה את כל ה-localStorage items
- **useEffect Hook**: בדיקה תקופתית (כל 5 דקות) של תוקף הטוקן

#### זרימת התהליך:
1. המשתמש מתחבר בהצלחה
2. הטוקן נשמר עם זמן expiration (time now + 1 hour)
3. setTimeout מוגדר ל-1 שעה
4. כאשר השעה מסתיימת, המערכת מבצעת logout אוטומטי

---

### 2. App.tsx
**קובץ:** `lab_orders_client/src/App.tsx`

#### שינויים:
- קריאה של `tokenExpiration` מ-localStorage בכל useEffect
- בדיקה ראשונה של ה-session timeout
- ניקוי של `tokenExpiration` ו-`logoutTimeoutId` בעת logout
- בדיקה של expiration לפני בדיקת JWT token

#### זרימת התהליך:
1. בטעינת האפליקציה, מתבדקים שני תנאים:
   - **Session Timeout Check**: בדיקה אם ה-session פג תוקפו (זמן שהוגדר ב-Login)
   - **JWT Token Check**: בדיקה של ה-JWT token expiration

2. אם אחד מהם פג תוקפו, המערכת מבצעת logout ומעביר למסך ה-login

---

## Storage Items ב-localStorage

| Key | ערך | תיאור |
|-----|-----|-------|
| `token` | string | ה-JWT token |
| `user` | JSON | נתוני המשתמש |
| `tokenExpiration` | timestamp | זמן פקיעת התוקף (בשנייה) |
| `logoutTimeoutId` | number | ID של ה-timeout timer |

---

## תהליך Session Timeout

```
1. משתמש מתחבר
   ↓
2. השמירה:
   - token
   - tokenExpiration (now + 1 hour)
   - user
   ↓
3. setTimeout ל-1 שעה
   ↓
4. אחרי 1 שעה:
   handleLogout() מתבצעת אוטומטית
   ↓
5. ניקוי localStorage
   ↓
6. Redirect ל-/login
```

---

## בדיקה ותכונות בטיחות

- ✅ בדיקה תקופתית כל 5 דקות בעת שהמשתמש במערכת
- ✅ בדיקה של JWT expiration גם כן
- ✅ ניקוי מלא של מידע התחברות בעת logout
- ✅ Redirect אוטומטי ל-login page כאשר session פוקע
- ✅ הודעה למשתמש: "Session expired. Please log in again."

---

## כיצד לשנות את הזמן

אם תרצה לשנות את זמן ה-timeout, עדכן את `SESSION_TIMEOUT` ב-`Login.tsx`:

```typescript
// דוגמאות:
const SESSION_TIMEOUT = 30 * 60 * 1000;  // 30 דקות
const SESSION_TIMEOUT = 2 * 60 * 60 * 1000;  // 2 שעות
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;  // 24 שעות
```

---

## בדיקת התכונה

1. התחבר לאפליקציה
2. בדוק ב-DevTools (F12) → Storage → localStorage
3. אתה אמור לראות:
   - `token`
   - `tokenExpiration` (timestamp בעתיד)
   - `user` (JSON object)

4. המתן שעה או שנה את `SESSION_TIMEOUT` לערך קטן יותר לבדיקה
5. לאחר הזמן המוגדר, המערכת תבצע logout אוטומטי

---

## נקודות חשובות ⚠️

- הטוקן נשמר **בלבד** ב-localStorage (לא באופן מאובטח - בעתיד יוצע httpOnly cookies)
- ה-session timeout מתואם עם ה-JWT token expiration
- בעת סגירת הטאב, ה-localStorage נשמר (זה בכוונה לשמירה על הsesson)
- אם המשתמש סוגר את הטאב ופותח אחרי שעה, ה-App.tsx יבדוק שה-session פג

