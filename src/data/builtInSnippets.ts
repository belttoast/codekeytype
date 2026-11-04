import type { Snippet } from '../types';

export const BUILT_IN_SNIPPETS: Snippet[] = [
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
