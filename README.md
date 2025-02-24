# webapp

     This is a cloud-native web application with a health check API. It is built using Node.js, Express.js, and PostgreSQL with Sequelize ORM.

# Prerequisites

-**Node.js (>=16.x) and npm**

-**PostgreSQL**

-**Git (for version control)**

-**Docker** 

-**DBeaver**

-**Postman**


## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd webapp
```
### 2. Install Dependencies
```bash
npm install
```
### 3. Configure Database
```json

{
  "development": {
    "username": "postgres",
    "password": "password",
    "database": "postgres",
    "host": "localhost",
    "dialect": "postgres",
    "port": 5433
  }
}
```
Using Docker to start PostgreSQL container:

```bash

docker start my_postgres
```
### 4. Run Database Migrations
```bash

npx sequelize-cli db:migrate
```
### 5. Start the Application

``` bash

npm run dev
```
For production:

```bash
npm start
```
### 6. To verify the Health Check API

``` bash
curl -X GET http://localhost:8080/healthz
```
A 200 OK response indicates the service is running correctly.

# Troubleshooting

-**Ensure PostgreSQL is running and accessible.**
-**While using Docker, make sure the PostgreSQL container is running:
``` bash
docker start my_postgres
```
-**Check that the correct port (5433) is used for the database.**

# License
-**This project is licensed under the ISC License.**






