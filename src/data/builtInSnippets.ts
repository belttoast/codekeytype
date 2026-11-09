import type { Snippet } from '../types';

export const BUILT_IN_SNIPPETS: Snippet[] = [
  // ==========================================
  // --- COMPETITION: BACKEND PRACTICE ---
  // ==========================================
  {
    id: 'backend-commands-start',
    title: 'Backend: 1. Commands to Start',
    description: 'Terminal commands: MariaDB setup, npm install, and run server',
    language: 'bash',
    category: 'backend',
    practiceType: 'commands',
    code: `# 1. Set MariaDB path if not recognized in PATH
set PATH=%PATH%;C:\\Program Files\\MariaDB 13.0\\bin

# 2. Import database schema into MariaDB
mariadb -u root < database.sql

# 3. Create backend folder and install dependencies
mkdir backend
cd backend
npm init -y
npm install express cors mysql2 jsonwebtoken multer
mkdir uploads

# 4. Start backend server
node server.js`
  },
  {
    id: 'backend-code-database-sql',
    title: 'Backend: 2. Write database.sql',
    description: 'MariaDB SQL: users table schema and initial test records',
    language: 'sql',
    category: 'backend',
    practiceType: 'code',
    code: `CREATE DATABASE IF NOT EXISTS eval_db;
USE eval_db;
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL,
  emp_score INT DEFAULT NULL,
  boss_score INT DEFAULT NULL,
  dir_score INT DEFAULT NULL,
  file_url VARCHAR(255) DEFAULT NULL
);
INSERT INTO users (username, password, name, role) VALUES
('emp1', '1234', 'สมชาย ใจดี', 'employee'),
('emp2', '1234', 'สมหญิง สดใส', 'employee'),
('boss', '1234', 'หัวหน้าสมศักดิ์', 'boss'),
('dir', '1234', 'ผอ.เกรียงไกร', 'director');`
  },
  {
    id: 'backend-code-server-js',
    title: 'Backend: 3. Write server.js',
    description: 'Complete backend server: Express, JWT auth, Multer upload, CRUD & Excel import/export',
    language: 'javascript',
    category: 'backend',
    practiceType: 'code',
    code: `const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
const uploadDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));

const SECRET = 'jwt_secret';
const upload = multer({ dest: uploadDir });
const db = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'eval_db' });

const send = (res, status, message, data = null) => res.status(status).json({ status, message, data });

const auth = (req, res, next) => {
  try {
    req.user = jwt.verify(req.headers.authorization?.split(' ')[1], SECRET);
    next();
  } catch {
    send(res, 401, 'กรุณาเข้าสู่ระบบก่อนดำเนินการ');
  }
};

// 1. Login ออก JWT (POST /api/login | Body: {"username":"emp1","password":"1234"})
// 200 OK: { status: 200, message: "เข้าสู่ระบบสำเร็จ", data: { token: "...", user: {...} } }
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const [rows] = await db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
    if (!rows.length) return send(res, 401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    const token = jwt.sign({ id: rows[0].id, name: rows[0].name, role: rows[0].role }, SECRET, { expiresIn: '1d' });
    send(res, 200, 'เข้าสู่ระบบสำเร็จ', { token, user: rows[0] });
  } catch {
    send(res, 500, 'เชื่อมต่อฐานข้อมูลล้มเหลว');
  }
});

// 2. อัปโหลดไฟล์ (POST /api/upload | Form-Data: file=<เลือกไฟล์> | Header: Authorization Bearer <TOKEN>)
// 200 OK: { status: 200, message: "อัปโหลดสำเร็จ", data: { url: "filename.png" } }
app.post('/api/upload', auth, upload.single('file'), (req, res) => {
  req.file ? send(res, 200, 'อัปโหลดสำเร็จ', { url: req.file.filename }) : send(res, 400, 'ไม่พบไฟล์');
});

// 3. Dashboard ค้นหา + แบ่งหน้า (GET /api/dashboard?search=&page=1 | Header: Authorization Bearer <TOKEN>)
// 200 OK: { status: 200, message: "สำเร็จ", data: { items: [...], totalPages: 2 } }
app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const { search = '', page = 1 } = req.query;
    const limit = 3, offset = (Math.max(1, Number(page)) - 1) * limit;
    const [items] = await db.query(\`
      SELECT id, name, emp_score, boss_score, dir_score, file_url,
        ROUND((COALESCE(emp_score,0)+COALESCE(boss_score,0)+COALESCE(dir_score,0))/3, 2) AS avg_score
      FROM users WHERE role = 'employee' AND name LIKE ? LIMIT ? OFFSET ?
    \`, [\`%\${search}%\`, limit, offset]);
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM users WHERE role = "employee" AND name LIKE ?', [\`%\${search}%\`]);
    send(res, 200, 'สำเร็จ', { items, totalPages: Math.ceil(total / limit) || 1 });
  } catch {
    send(res, 500, 'ดึงข้อมูลไม่สำเร็จ');
  }
});

// 4. รายการรอประเมิน (GET /api/pending/boss หรือ /api/pending/director | Header: Authorization Bearer <TOKEN>)
// 200 OK: { status: 200, message: "สำเร็จ", data: [ { id: 2, name: "...", emp_score: 80, file_url: null } ] }
app.get('/api/pending/:role', auth, async (req, res) => {
  try {
    const sql = req.params.role === 'boss'
      ? 'SELECT id, name, emp_score, file_url FROM users WHERE role="employee" AND emp_score IS NOT NULL AND boss_score IS NULL'
      : 'SELECT id, name, emp_score, boss_score, file_url FROM users WHERE role="employee" AND boss_score IS NOT NULL AND dir_score IS NULL';
    const [rows] = await db.query(sql);
    send(res, 200, 'สำเร็จ', rows);
  } catch {
    send(res, 500, 'เกิดข้อผิดพลาด');
  }
});

// 5. บันทึกผลคะแนน (POST /api/evaluate | Body: {"id":1,"role":"employee","score":85,"file_url":"..."} | Header: Authorization Bearer <TOKEN>)
// 200 OK: { status: 200, message: "บันทึกคะแนนเรียบร้อย", data: null }
app.post('/api/evaluate', auth, async (req, res) => {
  try {
    const { id, role, score, file_url } = req.body || {};
    const col = role === 'employee' ? 'emp_score' : role === 'boss' ? 'boss_score' : 'dir_score';
    await db.query(\`UPDATE users SET \${col} = ?, file_url = COALESCE(?, file_url) WHERE id = ?\`, [score, file_url || null, id]);
    send(res, 200, 'บันทึกคะแนนเรียบร้อย');
  } catch {
    send(res, 500, 'บันทึกไม่สำเร็จ');
  }
});

// 6. แก้ไขข้อมูลและไฟล์แนบ (PUT /api/evaluate/1 | Body: {"score":90,"file_url":"..."} | Header: Authorization Bearer <TOKEN>)
// 200 OK: { status: 200, message: "แก้ไขข้อมูลเรียบร้อย", data: null }
app.put('/api/evaluate/:id', auth, async (req, res) => {
  try {
    const { score, file_url } = req.body || {};
    await db.query('UPDATE users SET emp_score = ?, file_url = COALESCE(?, file_url) WHERE id = ?', [score, file_url || null, req.params.id]);
    send(res, 200, 'แก้ไขข้อมูลเรียบร้อย');
  } catch {
    send(res, 500, 'แก้ไขไม่สำเร็จ');
  }
});

// 7. ลบข้อมูลคะแนน (DELETE /api/evaluate/1 | Header: Authorization Bearer <TOKEN>)
// 200 OK: { status: 200, message: "ลบข้อมูลเรียบร้อย", data: null }
app.delete('/api/evaluate/:id', auth, async (req, res) => {
  try {
    await db.query('UPDATE users SET emp_score = NULL, boss_score = NULL, dir_score = NULL, file_url = NULL WHERE id = ?', [req.params.id]);
    send(res, 200, 'ลบข้อมูลเรียบร้อย');
  } catch {
    send(res, 500, 'ลบไม่สำเร็จ');
  }
});

// 8. Export CSV (GET /api/export | Header: Authorization Bearer <TOKEN>)
// 200 OK: { status: 200, message: "สำเร็จ", data: [ { id: 1, name: "...", emp_score: 89, avg_score: 96.33 } ] }
app.get('/api/export', auth, async (req, res) => {
  const [rows] = await db.query(\`
    SELECT id, name, emp_score, boss_score, dir_score,
      ROUND((COALESCE(emp_score,0)+COALESCE(boss_score,0)+COALESCE(dir_score,0))/3, 2) AS avg_score
    FROM users WHERE role = 'employee' ORDER BY id ASC
  \`);
  send(res, 200, 'สำเร็จ', rows);
});

// 9. Import CSV (POST /api/import | Body: {"csv":"id,name,emp,boss,dir\\n1,สมชาย,90,90,90"} | Header: Authorization Bearer <TOKEN>)
// 200 OK: { status: 200, message: "นำเข้าสำเร็จ", data: null }
app.post('/api/import', auth, async (req, res) => {
  try {
    const lines = (req.body.csv || '').trim().split('\\n').slice(1);
    for (const line of lines) {
      const [id, name, emp, boss, dir] = line.split(',').map((s: string) => s?.trim());
      if (id && !isNaN(Number(id))) {
        await db.query('UPDATE users SET name=COALESCE(NULLIF(?,""), name), emp_score=NULLIF(?,""), boss_score=NULLIF(?,""), dir_score=NULLIF(?,"") WHERE id = ?', [name, emp, boss, dir, id]);
      }
    }
    send(res, 200, 'นำเข้าสำเร็จ');
  } catch {
    send(res, 500, 'นำเข้าไม่สำเร็จ');
  }
});

app.listen(5000, () => console.log('Server running on port 5000'));`
  },
  {
    id: 'backend-postman-practice',
    title: 'Backend: 4. Postman API Testing',
    description: 'Postman methods, URLs, headers, request bodies, and expected 200 OK responses',
    language: 'javascript',
    category: 'backend',
    practiceType: 'code',
    code: `// ==========================================
// --- POSTMAN API TESTING (9 ROUTES) ---
// ==========================================

// --- 1. Login (POST /api/login) ---
// Method: POST
// URL: http://localhost:5000/api/login
// Header: Content-Type: application/json
{
  "username": "emp1",
  "password": "1234"
}
// Expected Result (200 OK):
// { "status": 200, "message": "เข้าสู่ระบบสำเร็จ", "data": { "token": "...", "user": { "id": 1, "name": "สมชาย ใจดี", "role": "employee" } } }

// --- 2. Upload File (POST /api/upload) ---
// Method: POST
// URL: http://localhost:5000/api/upload
// Header: Authorization: Bearer <TOKEN>
// Body (form-data): key = file (File)
// Expected Result (200 OK):
// { "status": 200, "message": "อัปโหลดสำเร็จ", "data": { "url": "abc123xyz.png" } }

// --- 3. Dashboard (GET /api/dashboard) ---
// Method: GET
// URL: http://localhost:5000/api/dashboard?search=&page=1
// Header: Authorization: Bearer <TOKEN>
// Expected Result (200 OK):
// { "status": 200, "message": "สำเร็จ", "data": { "items": [{ "id": 1, "name": "สมชาย ใจดี", "emp_score": 89, "boss_score": 100, "dir_score": 100, "avg_score": 96.33 }], "totalPages": 2 } }

// --- 4. Pending Evaluations (GET /api/pending/:role) ---
// Method: GET
// URL: http://localhost:5000/api/pending/boss
// Header: Authorization: Bearer <TOKEN>
// Expected Result (200 OK):
// { "status": 200, "message": "สำเร็จ", "data": [{ "id": 2, "name": "สมหญิง สดใส", "emp_score": 80, "file_url": null }] }

// --- 5. Save Score (POST /api/evaluate) ---
// Method: POST
// URL: http://localhost:5000/api/evaluate
// Headers: Authorization: Bearer <TOKEN> | Content-Type: application/json
{
  "id": 1,
  "role": "employee",
  "score": 85,
  "file_url": "abc123xyz.png"
}
// Expected Result (200 OK):
// { "status": 200, "message": "บันทึกคะแนนเรียบร้อย", "data": null }

// --- 6. Edit Score (PUT /api/evaluate/:id) ---
// Method: PUT
// URL: http://localhost:5000/api/evaluate/1
// Headers: Authorization: Bearer <TOKEN> | Content-Type: application/json
{
  "score": 90,
  "file_url": "updated.png"
}
// Expected Result (200 OK):
// { "status": 200, "message": "แก้ไขข้อมูลเรียบร้อย", "data": null }

// --- 7. Delete Score (DELETE /api/evaluate/:id) ---
// Method: DELETE
// URL: http://localhost:5000/api/evaluate/1
// Header: Authorization: Bearer <TOKEN>
// Expected Result (200 OK):
// { "status": 200, "message": "ลบข้อมูลเรียบร้อย", "data": null }

// --- 8. Export CSV (GET /api/export) ---
// Method: GET
// URL: http://localhost:5000/api/export
// Header: Authorization: Bearer <TOKEN>
// Expected Result (200 OK):
// { "status": 200, "message": "สำเร็จ", "data": [{ "id": 1, "name": "สมชาย ใจดี", "emp_score": 89, "boss_score": 100, "dir_score": 100, "avg_score": 96.33 }] }

// --- 9. Import CSV (POST /api/import) ---
// Method: POST
// URL: http://localhost:5000/api/import
// Headers: Authorization: Bearer <TOKEN> | Content-Type: application/json
{
  "csv": "id,name,emp_score,boss_score,dir_score\\n1,สมชาย ใจดี,95,95,95"
}
// Expected Result (200 OK):
// { "status": 200, "message": "นำเข้าสำเร็จ", "data": null }`
  },
  {
    id: 'backend-git-push',
    title: 'Backend: 5. Push to Git',
    description: 'Git workflow: .gitignore, init, add, commit, branch, remote, and push',
    language: 'bash',
    category: 'backend',
    practiceType: 'git',
    code: `# 1. Create .gitignore for heavy folders
echo node_modules > .gitignore
echo uploads >> .gitignore

# 2. Initialize Git repository
git init

# 3. Stage all files
git add .

# 4. Commit backend implementation
git commit -m "feat(backend): complete api and database"

# 5. Connect to remote repository
git remote add origin https://github.com/username/repo.git

# 6. Set main branch and push
git branch -M main
git push -u origin main`
  },
  {
    id: 'backend-commands-all',
    title: 'Backend: 6. All Terminal Commands',
    description: 'Complete backend command flow: MariaDB, npm install, run, and Git push',
    language: 'bash',
    category: 'backend',
    practiceType: 'commands',
    code: `# === 1. DATABASE & SERVER SETUP ===
set PATH=%PATH%;C:\\Program Files\\MariaDB 13.0\\bin
mariadb -u root < database.sql
mkdir backend
cd backend
npm init -y
npm install express cors mysql2 jsonwebtoken multer
mkdir uploads
node server.js

# === 2. GIT WORKFLOW (RUN FROM PROJECT ROOT) ===
cd ..
echo node_modules > .gitignore
echo uploads >> .gitignore
git init
git add .
git commit -m "feat(backend): complete api and database"
git remote add origin https://github.com/username/repo.git
git branch -M main
git push -u origin main`
  },

  // ==========================================
  // --- COMPETITION: FRONTEND PRACTICE ---
  // ==========================================
  {
    id: 'frontend-commands-start',
    title: 'Frontend: 1. Commands to Start',
    description: 'Terminal commands: initialize Next.js with Tailwind & run dev server',
    language: 'bash',
    category: 'frontend',
    practiceType: 'commands',
    code: `# 1. Create Next.js app with TypeScript and Tailwind
npx create-next-app@latest frontend --typescript --tailwind --eslint=false --app --src-dir=false --use-npm --yes

# 2. Enter frontend folder
cd frontend

# 3. Start development server
npm run dev`
  },
  {
    id: 'frontend-code-next-config',
    title: 'Frontend: 2. Write next.config.ts',
    description: 'Disable dev indicators to hide dev badges',
    language: 'typescript',
    category: 'frontend',
    practiceType: 'code',
    code: `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
};

export default nextConfig;`
  },
  {
    id: 'frontend-code-page-tsx',
    title: 'Frontend: 3. Write app/page.tsx',
    description: 'Complete frontend: login, employee form, grading, dashboard, & Excel CSV',
    language: 'typescript',
    category: 'frontend',
    practiceType: 'code',
    code: `'use client';

import { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';
const UPLOAD_URL = 'http://localhost:5000/uploads';
const roleNames: Record<string, string> = { employee: 'พนักงาน', boss: 'หัวหน้างาน', director: 'ผู้อำนวยการ' };

const req = async (url: string, method = 'GET', body?: any) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(\`\${API}\${url}\`, {
    method,
    headers: {
      ...(token && { Authorization: \`Bearer \${token}\` }),
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'เกิดข้อผิดพลาด');
  return json.data;
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isEditing, setIsEditing] = useState(false);

  const load = async (u = user, p = page, s = search) => {
    if (!u) return;
    try {
      const [d, pend] = await Promise.all([
        req(\`/dashboard?search=\${s}&page=\${p}\`),
        u.role !== 'employee' ? req(\`/pending/\${u.role}\`) : [],
      ]);
      setList(d.items);
      setTotalPages(d.totalPages);
      setPending(pend);
      if (u.role === 'employee') {
        const me = d.items.find((x: any) => x.id === u.id);
        if (me) setUser((prev: any) => ({ ...prev, emp_score: me.emp_score, file_url: me.file_url }));
      }
    } catch (err: any) { alert(err.message); }
  };

  useEffect(() => { if (user) load(user, page, search); }, [user?.id, page, search]);

  const upload = async (file?: File) => {
    if (!file) return null;
    const fd = new FormData();
    fd.append('file', file);
    return (await req('/upload', 'POST', fd)).url;
  };

  const login = async (e: any) => {
    e.preventDefault();
    try {
      const data = await req('/login', 'POST', { username: e.target.u.value, password: e.target.p.value });
      localStorage.setItem('token', data.token);
      setUser(data.user);
      load(data.user, 1, '');
    } catch (err: any) { alert(err.message); }
  };

  const save = async (e: any) => {
    e.preventDefault();
    try {
      const file_url = await upload(e.target.file?.files?.[0]);
      const score = e.target.score.value;
      if (isEditing) {
        await req(\`/evaluate/\${user.id}\`, 'PUT', { score, file_url });
        setIsEditing(false);
      } else {
        await req('/evaluate', 'POST', { id: user.id, role: 'employee', score, file_url });
      }
      alert('บันทึกเรียบร้อย');
      load();
    } catch (err: any) { alert(err.message); }
  };

  const evaluateOther = async (id: number, score: string) => {
    try {
      await req('/evaluate', 'POST', { id, role: user.role, score });
      alert('บันทึกคะแนนเรียบร้อย');
      load();
    } catch (err: any) { alert(err.message); }
  };

  const del = async () => {
    if (!confirm('ยืนยันที่จะลบข้อมูลการประเมินนี้หรือไม่?')) return;
    try {
      await req(\`/evaluate/\${user.id}\`, 'DELETE');
      alert('ลบข้อมูลเรียบร้อย');
      load();
    } catch (err: any) { alert(err.message); }
  };

  const exportCSV = async () => {
    try {
      const data = await req('/export');
      const header = 'id,name,self_score,boss_score,dir_score,avg_score\\n';
      const rows = data.map((e: any) => \`\${e.id},\${e.name},\${e.emp_score ?? ''},\${e.boss_score ?? ''},\${e.dir_score ?? ''},\${e.avg_score}\`).join('\\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['\\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' }));
      a.download = 'evaluations.csv';
      a.click();
    } catch (err: any) { alert(err.message); }
  };

  const importCSV = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await req('/import', 'POST', { csv: await file.text() });
      alert('นำเข้าสำเร็จ');
      e.target.value = '';
      load();
    } catch (err: any) { alert(err.message); }
  };

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <form onSubmit={login} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-sm space-y-4">
          <div className="text-center mb-2">
            <h1 className="text-xl font-bold text-slate-800">ระบบประเมินผลการปฏิบัติงาน</h1>
          </div>
          <input name="u" placeholder="ชื่อผู้ใช้งาน (emp1-4, boss, dir)" className="border border-slate-300 w-full p-2.5 rounded-lg text-sm" required />
          <input name="p" type="password" placeholder="รหัสผ่าน (1234)" className="border border-slate-300 w-full p-2.5 rounded-lg text-sm" required />
          <button className="bg-blue-600 hover:bg-blue-700 text-white w-full py-2.5 rounded-lg text-sm font-medium transition shadow-sm">
            เข้าสู่ระบบ
          </button>
        </form>
      </main>
    );
  }

  const getBadge = (e: any) => {
    if (e.dir_score !== null) return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">เสร็จสมบูรณ์</span>;
    if (e.boss_score !== null) return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">รอ ผอ.</span>;
    if (e.emp_score !== null) return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">รอหัวหน้า</span>;
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">รอพนักงาน</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <header className="flex justify-between items-center bg-white px-5 py-3.5 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-sm">ผู้ใช้งาน:</span>
          <strong className="text-slate-800 text-sm">{user.name}</strong>
          <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-semibold">
            {roleNames[user.role]}
          </span>
        </div>
        <button onClick={() => { localStorage.removeItem('token'); setUser(null); }} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition">
          ออกจากระบบ
        </button>
      </header>

      {user.role === 'employee' && (
        <section className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-base font-bold text-slate-800 mb-3 pb-2 border-b">แบบประเมินตนเอง (คะแนนเต็ม 100)</h2>
          {user.emp_score !== null && !isEditing ? (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-lg">
              <div>
                <span className="text-emerald-800 font-semibold text-sm">คะแนนประเมินตนเอง: {user.emp_score} / 100</span>
                {user.file_url && (
                  <a href={\`\${UPLOAD_URL}/\${user.file_url}\`} target="_blank" className="ml-3 text-blue-600 underline text-xs">
                    ดูไฟล์หลักฐาน
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition">
                  แก้ไขคะแนน/ไฟล์
                </button>
                <button onClick={del} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition">
                  ลบข้อมูล
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={save} className="flex flex-wrap items-center gap-3">
              <input name="score" type="number" min="0" max="100" placeholder="คะแนน 0-100" defaultValue={user.emp_score || ''} className="border border-slate-300 px-3 py-1.5 rounded-lg w-28 text-center text-sm" required />
              <input name="file" type="file" className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:cursor-pointer" />
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition shadow-sm">
                {isEditing ? 'บันทึกการแก้ไข' : 'บันทึกคะแนน'}
              </button>
              {isEditing && (
                <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium">
                  ยกเลิก
                </button>
              )}
            </form>
          )}
        </section>
      )}

      {user.role !== 'employee' && (
        <section className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-base font-bold text-slate-800 mb-3 pb-2 border-b">รายการรอการประเมิน ({roleNames[user.role]})</h2>
          {pending.length === 0 ? (
            <p className="text-slate-400 text-center py-4 text-sm bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              ไม่มีรายชื่อพนักงานที่รอการประเมินในขณะนี้
            </p>
          ) : (
            <div className="space-y-2.5">
              {pending.map((p: any) => (
                <form key={p.id} onSubmit={(e: any) => { e.preventDefault(); evaluateOther(p.id, e.target.score.value); }} className="flex flex-wrap items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 gap-3 text-sm">
                  <div>
                    <span className="font-semibold text-slate-800">{p.name}</span>
                    <span className="text-slate-500 text-xs ml-2">(ตนเอง: {p.emp_score}{p.boss_score !== undefined ? \`, หัวหน้า: \${p.boss_score}\` : ''})</span>
                    {p.file_url && <a href={\`\${UPLOAD_URL}/\${p.file_url}\`} target="_blank" className="ml-2 text-blue-600 underline text-xs">ไฟล์หลักฐาน</a>}
                  </div>
                  <div className="flex items-center gap-2">
                    <input name="score" type="number" min="0" max="100" placeholder="0 - 100" className="border border-slate-300 px-2.5 py-1 w-24 rounded-lg text-center text-sm" required />
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium transition shadow-sm">
                      บันทึกคะแนน
                    </button>
                  </div>
                </form>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">กระดานสรุปผลการประเมิน (Dashboard)</h2>
              <p className="text-xs text-slate-500 mt-0.5">สูตรคำนวณค่าเฉลี่ย: (ตนเอง + หัวหน้า + ผอ.) / 3</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {user.role !== 'employee' && (
                <div className="flex gap-2">
                  <button onClick={exportCSV} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-sm transition">
                    Export Excel
                  </button>
                  <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-sm cursor-pointer transition">
                    Import Excel
                    <input type="file" accept=".csv" onChange={importCSV} className="hidden" />
                  </label>
                </div>
              )}
              <input type="text" placeholder="ค้นหาชื่อพนักงาน..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="border border-slate-300 px-3 py-1.5 rounded-lg text-xs w-44 bg-white" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200"><span className="text-slate-500">รอหัวหน้า</span> <strong className="text-sm text-amber-600 ml-1">{list.filter((x) => x.emp_score && !x.boss_score).length}</strong></div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200"><span className="text-slate-500">รอ ผอ.</span> <strong className="text-sm text-blue-600 ml-1">{list.filter((x) => x.boss_score && !x.dir_score).length}</strong></div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200"><span className="text-slate-500">เสร็จสมบูรณ์</span> <strong className="text-sm text-emerald-600 ml-1">{list.filter((x) => x.dir_score).length}</strong></div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/75 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">ชื่อพนักงาน</th>
                <th className="py-3 px-4 text-center">ตนเอง</th>
                <th className="py-3 px-4 text-center">หัวหน้า</th>
                <th className="py-3 px-4 text-center">ผอ.</th>
                <th className="py-3 px-4 text-center font-bold text-slate-900">คะแนนเฉลี่ย</th>
                <th className="py-3 px-4 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400 text-sm">ไม่พบข้อมูลพนักงาน</td></tr>
              ) : (
                list.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {emp.name}
                      {emp.file_url && <a href={\`\${UPLOAD_URL}/\${emp.file_url}\`} target="_blank" className="ml-2 text-xs text-blue-600 underline font-normal">ไฟล์</a>}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-600">{emp.emp_score ?? '-'}</td>
                    <td className="py-3.5 px-4 text-center text-slate-600">{emp.boss_score ?? '-'}</td>
                    <td className="py-3.5 px-4 text-center text-slate-600">{emp.dir_score ?? '-'}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-blue-600">
                      {emp.dir_score !== null ? <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-100">{emp.avg_score}</span> : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">{getBadge(emp)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-500">
          <span>แสดงหน้า {page} จากทั้งหมด {totalPages} หน้า</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-white transition bg-white text-slate-700 font-medium">
              &larr; ก่อนหน้า
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-white transition bg-white text-slate-700 font-medium">
              ถัดไป &rarr;
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}`
  },
  {
    id: 'frontend-git-push',
    title: 'Frontend: 4. Push to Git',
    description: 'Git workflow: pull backend updates, stage frontend, commit, and push',
    language: 'bash',
    category: 'frontend',
    practiceType: 'git',
    code: `# 1. Pull latest updates from backend teammate
git pull origin main

# 2. Check git status
git status

# 3. Stage frontend code
git add frontend/

# 4. Commit frontend changes
git commit -m "feat(frontend): complete evaluation UI and dashboard"

# 5. Push to remote repository
git push origin main`
  },
  {
    id: 'frontend-commands-all',
    title: 'Frontend: 5. All Terminal Commands',
    description: 'Complete frontend command flow: create Next.js, dev server, and Git push',
    language: 'bash',
    category: 'frontend',
    practiceType: 'commands',
    code: `# === 1. INITIALIZE NEXT.JS & RUN DEV ===
npx create-next-app@latest frontend --typescript --tailwind --eslint=false --app --src-dir=false --use-npm --yes
cd frontend
npm run dev

# === 2. GIT WORKFLOW (RUN FROM PROJECT ROOT) ===
cd ..
git pull origin main
git status
git add frontend/
git commit -m "feat(frontend): complete evaluation UI and dashboard"
git push origin main`
  },

  // ==========================================
  // --- COMPETITION: SERVER / DEVOPS PRACTICE ---
  // ==========================================
  {
    id: 'server-setup',
    title: 'Server: 1. Setup & Deployment (Docker, GitLab, Compose)',
    description: 'Docker install, GitLab CE server, and Docker Compose deployment',
    language: 'bash',
    category: 'server',
    practiceType: 'commands',
    code: `#ติดตั้ง Docker อัตโนมัติ
curl -fsSL https://get.docker.com/ | sh
#ติดตั้ง Docker Compose Plugin
sudo apt update && sudo apt install -y docker-compose-plugin
#ให้ User ปัจจุบันใช้งาน Docker ได้โดยไม่ต้องพิมพ์ sudo
sudo usermod -aG docker $USER && newgrp docker
### 2. ติดตั้ง GitLab (Git Server)
#ใช้คำสั่งนี้รัน GitLab ขึ้นมาบนเซิร์ฟเวอร์:
docker run -d --name gitlab --restart always \\
  -p 80:80 -p 443:443 -p 22:22 \\
  -v /srv/gitlab/config:/etc/gitlab \\
  -v /srv/gitlab/logs:/var/log/gitlab \\
  -v /srv/gitlab/data:/var/opt/gitlab \\
  gitlab/gitlab-ce:latest
docker exec -it gitlab grep 'Password:' /etc/gitlab/initial_root_password
# เข้าไปที่โฟลเดอร์โปรเจกต์
cd ~/my-project

# สั่ง Build และรันระบบทั้งหมด (Backend, Frontend, DB) พร้อมกัน
docker compose up -d --build

# เช็กสถานะการทำงานของคอนเทนเนอร์
docker compose ps

# ดู Log (กรณีเช็ก Error)
docker compose logs -f

# ปิดและหยุดระบบทั้งหมด
docker compose down`
  },
  {
    id: 'server-dockerfile',
    title: 'Server: 2. Write Dockerfile (Node.js 18 Alpine)',
    description: 'Competition Dockerfile: Node.js 18 base, dependencies, source copy, port 3000, start CMD',
    language: 'dockerfile',
    category: 'server',
    practiceType: 'code',
    code: `# 1. เลือก Base Image เป็น Node.js เวอร์ชั่น 18 ตามเกณฑ์การแข่งขัน
FROM node:18-alpine

# 2. กำหนดโฟลเดอร์ทำงานภายใน Container
WORKDIR /app

# 3. คัดลอกไฟล์ package.json มาติดตั้ง Dependencies
COPY package*.json ./
RUN npm install

# 4. คัดลอกโค้ดทั้งหมดในโปรเจกต์เข้าไป
COPY . .

# 5. เปิด Port 3000 สำหรับใช้งาน
EXPOSE 3000

# 6. คำสั่งเปิดรันแอปพลิเคชัน
CMD ["npm", "run", "start"]`
  },
  {
    id: 'server-docker-compose',
    title: 'Server: 3. Write docker-compose.yaml (App, DB, Caddy, Registry)',
    description: 'Full stack compose: Node.js App, MariaDB 10.8, Caddy Reverse Proxy, and Local Registry',
    language: 'yaml',
    category: 'server',
    practiceType: 'code',
    code: `version: '3.8'

services:
  app:
    build: .
    container_name: node_app
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=db
      - DB_USER=root
      - DB_PASSWORD=rootpassword
      - DB_NAME=competition_db
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mariadb:10.8
    container_name: mariadb_db
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: competition_db
    ports:
      - "3306:3306"
    volumes:
      - db_data:/var/lib/mysql
    restart: unless-stopped

  caddy:
    image: caddy:latest
    container_name: caddy_proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    restart: unless-stopped

  registry:
    image: registry:2
    container_name: local_registry
    ports:
      - "5000:5000"
    volumes:
      - registry_data:/var/lib/registry
    restart: unless-stopped

volumes:
  db_data:
  caddy_data:
  caddy_config:
  registry_data:`
  },
  {
    id: 'server-caddyfile',
    title: 'Server: 4. Write Caddyfile (Reverse Proxy)',
    description: 'Caddy reverse proxy mapping custom domain app.mydomain.lab to app:3000',
    language: 'bash',
    category: 'server',
    practiceType: 'code',
    code: `# Caddyfile reverse proxy to app:3000
app.mydomain.lab {
    reverse_proxy app:3000
}`
  },
  {
    id: 'server-ubuntu-docker-install',
    title: 'Server: 5. Ubuntu Docker Engine & Compose Install',
    description: 'Ubuntu official Docker Engine install: remove old, dependencies, GPG key, repo, and install',
    language: 'bash',
    category: 'server',
    practiceType: 'commands',
    code: `# 1. ลบเวอร์ชันเก่า (ถ้ามี)
sudo apt-get remove -y docker docker-engine docker.io containerd runc

# 2. ติดตั้งเครื่องมือที่จำเป็น
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# 3. เพิ่ม Docker GPG Key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 4. เพิ่ม Docker Repository ลงใน Ubuntu
echo \\
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \\
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \\
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 5. ติดตั้ง Docker Engine และ Compose Plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# เพิ่ม User เข้ากลุ่ม docker
sudo usermod -aG docker $USER`
  },

  // --- JAVASCRIPT / TYPESCRIPT ---
  {
    id: 'ts-binary-search',
    title: 'Binary Search',
    description: 'Classic logarithmic search algorithm',
    language: 'typescript',
    category: 'algorithm',
    code: `// Binary search: search target in sorted array
function binarySearch(arr: number[], target: number): number {
  // Initialize left and right bounds
  let left = 0;
  let right = arr.length - 1;

  // Narrow search range
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }

  // Not found
  return -1;
}`
  },
  {
    id: 'ts-use-debounce',
    title: 'React useDebounce Hook',
    description: 'Custom React hook for debouncing values',
    language: 'typescript',
    category: 'real-world',
    code: `// Debounce hook: delays state update until inactivity
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  // Set timeout on value change and cleanup
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}`
  },
  {
    id: 'js-async-fetch',
    title: 'Async API Fetcher',
    description: 'Fetch data with exponential backoff & error handling',
    language: 'javascript',
    category: 'real-world',
    code: `// Fetch helper with retry backoff
async function fetchWithRetry(url, retries = 3) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    return await res.json();
  } catch (err) {
    // Retry if attempts remain
    if (retries <= 1) throw err;
    await new Promise(r => setTimeout(r, 1000));
    return fetchWithRetry(url, retries - 1);
  }
}`
  },
  {
    id: 'js-two-sum',
    title: 'Two Sum Problem',
    description: 'Hash map solution for two sum in O(n) time',
    language: 'javascript',
    category: 'algorithm',
    code: `// Two sum: find indices of pair adding to target
function twoSum(nums, target) {
  const seen = new Map();
  // Traverse and match complement
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement), i];
    }
    seen.set(nums[i], i);
  }
  return [];
}`
  },

  // --- PYTHON ---
  {
    id: 'py-quicksort',
    title: 'Python QuickSort',
    description: 'Clean recursive quicksort with list comprehension',
    language: 'python',
    category: 'algorithm',
    code: `# Recursive quicksort with pivot partition
def quicksort(arr):
    # Base case for empty or single item
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    # Partition into left, middle, right
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)`
  },
  {
    id: 'py-fibonacci-memo',
    title: 'Memoized Fibonacci',
    description: 'Dynamic programming Fibonacci using Python dict',
    language: 'python',
    category: 'algorithm',
    code: `# Fibonacci with memoization dictionary
def fib(n, memo={}):
    if n in memo:
        return memo[n]
    if n <= 1:
        return n
    # Store subproblem result
    memo[n] = fib(n - 1, memo) + fib(n - 2, memo)
    return memo[n]`
  },
  {
    id: 'py-fastapi-route',
    title: 'FastAPI Endpoint',
    description: 'REST API endpoint with Pydantic validation',
    language: 'python',
    category: 'real-world',
    code: `# Route handler with path and query parameters
@app.get("/items/{item_id}", response_model=Item)
async def read_item(item_id: int, q: Optional[str] = None):
    # Validate item existence in database
    if item_id not in fake_db:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"id": item_id, "query": q, "status": "active"}`
  },

  // --- RUST ---
  {
    id: 'rs-error-handling',
    title: 'Rust Result Matcher',
    description: 'Idiomatic Rust pattern matching with Result',
    language: 'rust',
    category: 'real-world',
    code: `// Parse JSON config file with error propagation
fn parse_config(path: &str) -> Result<Config, io::Error> {
    let content = fs::read_to_string(path)?;
    // Pattern match deserialization result
    match serde_json::from_str(&content) {
        Ok(cfg) => Ok(cfg),
        Err(_) => Err(io::Error::new(io::ErrorKind::InvalidData, "Bad JSON")),
    }
}`
  },
  {
    id: 'rs-struct-impl',
    title: 'Rust Struct & Impl',
    description: 'Defining struct, constructor, and methods in Rust',
    language: 'rust',
    category: 'general',
    code: `// Simple stateful counter struct
pub struct Counter {
    count: usize,
}

impl Counter {
    // Constructor returns fresh instance
    pub fn new() -> Self {
        Counter { count: 0 }
    }

    // Mutable method increments internal count
    pub fn increment(&mut self) -> usize {
        self.count += 1;
        self.count
    }
}`
  },

  // --- GO ---
  {
    id: 'go-concurrent-worker',
    title: 'Go Goroutines & Channels',
    description: 'Worker pool using channels and sync.WaitGroup',
    language: 'go',
    category: 'real-world',
    code: `// Worker receives jobs and emits doubled results
func worker(id int, jobs <-chan int, results chan<- int, wg *sync.WaitGroup) {
    defer wg.Done()
    // Read from channel until closed
    for j := range jobs {
        results <- j * 2
    }
}`
  },
  {
    id: 'go-http-handler',
    title: 'Go HTTP Server Handler',
    description: 'Standard library HTTP JSON response handler',
    language: 'go',
    category: 'general',
    code: `// Health check JSON endpoint handler
func handleHealth(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    // Encode timestamped response
    json.NewEncoder(w).Encode(map[string]string{
        "status": "healthy",
        "time": time.Now().UTC().Format(time.RFC3339),
    })
}`
  },

  // --- C++ ---
  {
    id: 'cpp-lru-cache',
    title: 'C++ Vector & Lambda',
    description: 'Modern C++ algorithm transform with lambda',
    language: 'cpp',
    category: 'general',
    code: `// Filter positive numbers using STL copy_if
template <typename T>
std::vector<T> filterPositive(const std::vector<T>& vec) {
    std::vector<T> result;
    // Copy elements matching predicate
    std::copy_if(vec.begin(), vec.end(), std::back_inserter(result),
        [](const T& val) { return val > 0; });
    return result;
}`
  },

  // --- SQL ---
  {
    id: 'sql-window-query',
    title: 'SQL Window Function',
    description: 'Ranking users by revenue with window functions',
    language: 'sql',
    category: 'general',
    code: `-- Rank completed transactions by amount per category
SELECT 
    user_id,
    amount,
    DENSE_RANK() OVER (PARTITION BY category ORDER BY amount DESC) as rank
FROM transactions
WHERE status = 'completed';`
  },

  // --- HTML / CSS ---
  {
    id: 'css-center-flex',
    title: 'CSS Glassmorphism Card',
    description: 'Modern CSS backdrop blur card styling',
    language: 'css',
    category: 'short',
    code: `/* Modern frosted glass card styling */
.glass-card {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}`
  }
];
