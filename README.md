# HMS – Base Scaffold (Services + RabbitMQ + CockroachDB + Gateway + React Web)

## Run
```bash
cp .env.example .env
docker compose up --build
```
- RabbitMQ: http://localhost:15672 (guest/guest)
- Cockroach console: http://localhost:8080
- API Gateway: http://localhost:8088/healthz
- Web App: http://localhost:5173

## Try
```bash
curl -X POST http://localhost:8088/doctor/tests/order   -H 'Content-Type: application/json'   -d '{"patientId":"p-001","testType":"Blood","orderedBy":"d-123"}'

curl -X POST http://localhost:8088/admin/rooms/assign   -H 'Content-Type: application/json'   -d '{"patientId":"p-001","room":"A101"}'
```
