# Multi-Agent Layout

This project uses three functional agents:

- transport: dispatch and shipment routing
- preparation: preparation volumes and images
- test: preparation daily summary and team status monitoring in French or English

Transport now also exposes eight view-based tools for camion, chauffeur, retard, alertes, tendance 7j, jour vs cumul, KPI global, and resume manager questions.

## Test Tools

- hello_transport_agent

## HTTP Endpoints

- POST /tools/hello_transport_agent

## Notes

Preparation tools remain in the existing tools/ files and are shared by the HTTP server.
