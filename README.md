# HotMesh Pluck Dashboard
The HotMesh Dashboard is developed using Node.js and Express, functioning as an RPC-like HTTP API interface for the HotMesh Control Plane management. It facilitates interaction with the distributed HotMesh Service Mesh, enabling workflow monitoring, aggregation query execution, and overall service management.

A React-based WebApp, available upon request, serves as the graphical interface for the HTTP API functionalities. This setup is pivotal for overseeing operational workflows, executing aggregation queries, and managing the network of interconnected functions.

<img src="./app/img/dashboard.png" alt="Redis Insight" style="width:600px;max-width:600px">

Additionally, the API includes specific HTTP endpoints (e.g., `/api/v1/users` and `/api/v1/bills`) to demonstrate a RESTful approach for managing entities such as Users and Bills. These endpoints illustrate practical examples of interacting with the HotMesh Data Plane to perform tasks and execute workflows.

## Build
Build and run the project using Docker `compose`.

```bash
docker compose up --build -d
```

Upon launching, the Node application starts an Express HTTP server on port 3010, activating various workers necessary for the demonstration environment.

## Running the Application
To interact with the API, use an HTTP test client and engage with the `User` and `Bill` entity endpoints. For instance, to register a new user, POST a JSON payload to `http://localhost:3010/api/v1/users`:
  
  ```json
{
    "id": "fred.doe.1",
    "first": "Fred",
    "last": "Doe",
    "email": "fred.doe@pluck.com",
    "plan": "starter",
    "cycle": "monthly"
}
```

To initiate billing cycles for a user, POST a JSON payload to `http://localhost:3010/api/v1/users/:user_id/plans` (e.g,. `http://localhost:3010/api/v1/users/fred.doe.1/plans`).
  
  ```json
{
    "plan": "developer",
    "cycle": "yearly"
}
```

For a comprehensive interaction with the API, utilize the provided Postman collections found in the [postman](./postman/) directory.

## Telemetry Configuration
To incorporate telemetry data, optionally create a `.env` file at the project root. Populate it with your Honeycomb API key and service name to utilize the default OpenTelemetry tracer configured in `./services/tracer.ts`. Include the following keys:

```
HONEYCOMB_API_KEY=XXXXXXXXXX
OTEL_SERVICE_NAME=yyyy
```

## Visualization Tools
### OpenTelemetry Visualization
With the appropriate credentials, the full execution tree of OpenTelemetry can be visualized as a Directed Acyclic Graph (DAG), enabling the setup of dashboards and alerts based on process executions.

<img src="./img/opentelemetry.png" alt="Open Telemetry" style="width:600px;max-width:600px;">

### RedisInsight Visualization
RedisInsight can be used to observe Redis streams and the execution of workflows, providing a detailed view into data management and processing.

<img src="./img/redisinsight.png" alt="Redis Insight" style="width:600px;max-width:600px;">
