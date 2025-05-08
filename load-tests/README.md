
# Load Tests with [K6](https://k6.io/)

## Requirements

- Install K6: https://k6.io/docs/getting-started/installation/
- API must be running locally using `docker-compose up` or directly in the backend

## Test Files

- `main.js`: Main test using Leaky Bucket algorithm and full user flow  
- `api-performance.js`: Test for general API performance  
- `auth-test.js`: Test for user authentication  

## How to Run the Tests

### Main Leaky Bucket Test

```bash
k6 run load-tests/main.js
```

### API Performance Test

```bash
k6 run load-tests/api-performance.js
```

### Authentication Test

```bash
k6 run load-tests/auth-test.js
```

### Run a Specific Scenario

```bash
k6 run --tag scenario=leaky_bucket_test load-tests/main.js
```

## Result Analysis

After running the tests, K6 will show detailed metrics in the terminal, including:

- Requests per second (RPS)  
- Average response time  
- Response time percentiles (p90, p95, p99)  
- Error rate  
- Custom metrics for each test  

## Example Output

```
✓ successful registration  
✓ successful token query  
✓ tokens visible  
✓ pix request complete  
✓ no server errors  

✓ checks.........................: 100.00% ✓ 190 ✗ 0  
data_received..................: 83 kB 1.4 kB/s  
data_sent......................: 58 kB 974 B/s  
http_req_blocked...............: avg=15.23ms min=1µs med=3µs max=303.44ms p(90)=4µs p(95)=167.73ms  
http_req_connecting............: avg=6.12ms min=0s med=0s max=125.37ms p(90)=0s p(95)=66.92ms  
✓ http_req_duration..............: avg=180.49ms min=150.97ms med=179.08ms max=245.69ms p(90)=194.86ms p(95)=197.76ms  
http_req_receiving.............: avg=73.13µs min=42µs med=68µs max=226µs p(90)=96µs p(95)=107.45µs  
http_req_sending...............: avg=33.73µs min=15µs med=30µs max=151µs p(90)=45.2µs p(95)=58.7µs  
http_req_tls_handshaking.......: avg=0s min=0s med=0s max=0s p(90)=0s p(95)=0s  
http_req_waiting...............: avg=180.38ms min=150.87ms med=178.98ms max=245.55ms p(90)=194.77ms p(95)=197.64ms  
http_reqs......................: 38 0.633333/s  
iteration_duration.............: avg=1.5s min=1.5s med=1.5s max=1.5s p(90)=1.5s p(95)=1.5s  
iterations.....................: 19 0.316667/s  
tokens_consumed................: 15 0.25/s  
vus............................: 1 min=1 max=1  
vus_max........................: 10 min=10 max=10  
```

## Limitations and Parameters to Adjust

- **VUs (Virtual Users)**: Change this to test different levels of concurrency  
- **Duration**: Change the test duration if needed  
- **Thresholds**: Change the acceptance thresholds based on the environment and requirements  
