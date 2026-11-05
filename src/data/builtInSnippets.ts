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
    code: `# 1. Import database into MariaDB
mariadb -u root < database.sql

# 2. Setup backend folder & install 5 dependencies
mkdir backend
cd backend
npm init -y
npm install express cors mysql2 jsonwebtoken multer
mkdir uploads

# 3. Start backend server
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
    id: 'backend-code-server-setup',
    title: 'Backend: 3. server.js Setup & Auth',
    description: 'Express app, Multer uploads, MySQL pool, and JWT middleware',
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
};`
  },
  {
    id: 'backend-code-server-routes',
    title: 'Backend: 4. server.js Core API Routes',
    description: 'Login with JWT, Multer upload, and Dashboard with search & pagination',
    language: 'javascript',
    category: 'backend',
    practiceType: 'code',
    code: `app.post('/api/login', async (req, res) => {
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

app.post('/api/upload', auth, upload.single('file'), (req, res) => {
  req.file ? send(res, 200, 'อัปโหลดสำเร็จ', { url: req.file.filename }) : send(res, 400, 'ไม่พบไฟล์');
});

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
});`
  },
  {
    id: 'backend-code-server-evaluate',
    title: 'Backend: 5. server.js Evaluate CRUD & Port',
    description: 'Pending list, Evaluate POST, PUT edit, and DELETE reset',
    language: 'javascript',
    category: 'backend',
    practiceType: 'code',
    code: `app.get('/api/pending/:role', auth, async (req, res) => {
  const sql = req.params.role === 'boss'
    ? 'SELECT id, name, emp_score, file_url FROM users WHERE role="employee" AND emp_score IS NOT NULL AND boss_score IS NULL'
    : 'SELECT id, name, emp_score, boss_score, file_url FROM users WHERE role="employee" AND boss_score IS NOT NULL AND dir_score IS NULL';
  const [rows] = await db.query(sql);
  send(res, 200, 'สำเร็จ', rows);
});

app.post('/api/evaluate', auth, async (req, res) => {
  const { id, role, score, file_url } = req.body || {};
  const col = role === 'employee' ? 'emp_score' : role === 'boss' ? 'boss_score' : 'dir_score';
  await db.query(\`UPDATE users SET \${col} = ?, file_url = COALESCE(?, file_url) WHERE id = ?\`, [score, file_url || null, id]);
  send(res, 200, 'บันทึกคะแนนเรียบร้อย');
});

app.put('/api/evaluate/:id', auth, async (req, res) => {
  const { score, file_url } = req.body || {};
  await db.query('UPDATE users SET emp_score = ?, file_url = COALESCE(?, file_url) WHERE id = ?', [score, file_url || null, req.params.id]);
  send(res, 200, 'แก้ไขข้อมูลเรียบร้อย');
});

app.delete('/api/evaluate/:id', auth, async (req, res) => {
  await db.query('UPDATE users SET emp_score = NULL, boss_score = NULL, dir_score = NULL, file_url = NULL WHERE id = ?', [req.params.id]);
  send(res, 200, 'ลบข้อมูลเรียบร้อย');
});

app.listen(5000, () => console.log('Server running on port 5000'));`
  },
  {
    id: 'backend-git-push',
    title: 'Backend: 6. Push to Git',
    description: 'Git workflow: create .gitignore, stage, commit, and push backend',
    language: 'bash',
    category: 'backend',
    practiceType: 'git',
    code: `# Create .gitignore to ignore heavy files
echo "node_modules\\n.next\\nuploads" > .gitignore

# Stage all files
git add .

# Commit backend implementation
git commit -m "feat(backend): complete database schema and express api"

# Push to remote GitLab repository
git push origin main`
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
    id: 'frontend-code-config-and-css',
    title: 'Frontend: 2. next.config.ts & globals.css',
    description: 'Disable dev indicators and setup background stylesheet',
    language: 'typescript',
    category: 'frontend',
    practiceType: 'code',
    code: `// frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
};

export default nextConfig;`
  },
  {
    id: 'frontend-code-req-helper',
    title: 'Frontend: 3. API Request Helper with JWT',
    description: 'Standard fetch wrapper with auto Authorization Bearer token',
    language: 'typescript',
    category: 'frontend',
    practiceType: 'code',
    code: `const API = 'http://localhost:5000/api';
const UPLOAD_URL = 'http://localhost:5000/uploads';
const roleNames: Record<string, string> = { employee: 'พนักงาน', boss: 'หัวหน้างาน', director: 'ผู้อำนวยการ' };

// API request helper with auto JWT header injection
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
};`
  },
  {
    id: 'frontend-code-actions',
    title: 'Frontend: 4. Login, Save, & Delete Actions',
    description: 'Client-side handlers for JWT login, evaluate POST/PUT, and DELETE',
    language: 'typescript',
    category: 'frontend',
    practiceType: 'code',
    code: `const login = async (e: any) => {
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

const del = async () => {
  if (!confirm('ยืนยันที่จะลบข้อมูลการประเมินนี้หรือไม่?')) return;
  try {
    await req(\`/evaluate/\${user.id}\`, 'DELETE');
    alert('ลบข้อมูลเรียบร้อย');
    load();
  } catch (err: any) { alert(err.message); }
};`
  },
  {
    id: 'frontend-code-export-import',
    title: 'Frontend: 5. Excel CSV Export & Import',
    description: 'Browser CSV generator and file parser for Excel round-trip',
    language: 'typescript',
    category: 'frontend',
    practiceType: 'code',
    code: `const exportCSV = async () => {
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
};`
  },
  {
    id: 'frontend-git-push',
    title: 'Frontend: 6. Push to Git',
    description: 'Git workflow: pull backend updates, stage frontend, commit, and push',
    language: 'bash',
    category: 'frontend',
    practiceType: 'git',
    code: `# Pull latest updates from backend teammate
git pull origin main

# Check git status
git status

# Stage frontend code
git add frontend/

# Commit frontend changes
git commit -m "feat(frontend): complete evaluation UI and dashboard"

# Push to remote repository
git push origin main`
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
