import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  stages: [
    { duration: "30s", target: 25 },
    { duration: "1m", target: 50 },
    { duration: "1m", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    "http_req_duration{name:home}": ["p(95)<800"],
    "http_req_duration{name:categories}": ["p(95)<300"],
    "http_req_duration{name:coupons}": ["p(95)<300"],
    "http_req_duration{name:session}": ["p(95)<300"],
    "http_req_duration{name:cart}": ["p(95)<300"],
  },
};

export default function () {
  http.get(`${BASE}/`, { tags: { name: "home" } });
  http.get(`${BASE}/api/categories`, { tags: { name: "categories" } });
  http.get(`${BASE}/api/coupons/active`, { tags: { name: "coupons" } });

  const s = http.get(`${BASE}/api/guest/session`, {
    tags: { name: "session" },
  });
  check(s, { "session ok": (r) => r.status >= 200 && r.status < 300 });

  http.get(`${BASE}/api/cart`, { tags: { name: "cart" } });
  sleep(1);
}
