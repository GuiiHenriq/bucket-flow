# Testes de Carga com [K6](https://k6.io/)

## Requisitos

- Instalar K6: https://k6.io/docs/getting-started/installation/
- A API deve estar rodando localmente usando `docker-compose up` ou diretamente no backend

## Arquivos de Teste

- `main.js`: Teste principal usando algoritmo Leaky Bucket e fluxo completo do usuário  
- `api-performance.js`: Teste para performance geral da API  
- `auth-test.js`: Teste para autenticação de usuário  

## Como Executar os Testes

### Teste Principal Leaky Bucket

```bash
k6 run load-tests/main.js
```

### Teste de Performance da API

```bash
k6 run load-tests/api-performance.js
```

### Teste de Autenticação

```bash
k6 run load-tests/auth-test.js
```

### Executar um Cenário Específico

```bash
k6 run --tag scenario=leaky_bucket_test load-tests/main.js
```

## Análise dos Resultados

Após executar os testes, o K6 mostrará métricas detalhadas no terminal, incluindo:

- Requisições por segundo (RPS)  
- Tempo médio de resposta  
- Percentis de tempo de resposta (p90, p95, p99)  
- Taxa de erro  
- Métricas personalizadas para cada teste  

## Exemplo de Saída

```
✓ registro bem-sucedido  
✓ consulta de tokens bem-sucedida  
✓ tokens visíveis  
✓ requisição pix completa  
✓ sem erros do servidor  

✓ verificações....................: 100.00% ✓ 190 ✗ 0  
dados_recebidos.................: 83 kB 1.4 kB/s  
dados_enviados.................: 58 kB 974 B/s  
http_req_bloqueado.............: avg=15.23ms min=1µs med=3µs max=303.44ms p(90)=4µs p(95)=167.73ms  
http_req_conectando............: avg=6.12ms min=0s med=0s max=125.37ms p(90)=0s p(95)=66.92ms  
✓ http_req_duracao...............: avg=180.49ms min=150.97ms med=179.08ms max=245.69ms p(90)=194.86ms p(95)=197.76ms  
http_req_recebendo.............: avg=73.13µs min=42µs med=68µs max=226µs p(90)=96µs p(95)=107.45µs  
http_req_enviando..............: avg=33.73µs min=15µs med=30µs max=151µs p(90)=45.2µs p(95)=58.7µs  
http_req_tls_handshake.........: avg=0s min=0s med=0s max=0s p(90)=0s p(95)=0s  
http_req_aguardando............: avg=180.38ms min=150.87ms med=178.98ms max=245.55ms p(90)=194.77ms p(95)=197.64ms  
http_reqs......................: 38 0.633333/s  
duracao_iteracao..............: avg=1.5s min=1.5s med=1.5s max=1.5s p(90)=1.5s p(95)=1.5s  
iteracoes.....................: 19 0.316667/s  
tokens_consumidos.............: 15 0.25/s  
vus............................: 1 min=1 max=1  
vus_max........................: 10 min=10 max=10  
```

## Limitações e Parâmetros para Ajustar

- **VUs (Usuários Virtuais)**: Altere para testar diferentes níveis de concorrência  
- **Duração**: Altere a duração do teste se necessário  
- **Limites**: Altere os limites de aceitação baseado no ambiente e requisitos
