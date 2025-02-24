require("dotenv").config();
const app = require("../app");
const request = require("supertest");
 
// Mock the sequelize and HealthCheck model correctly
jest.mock("../models", () => {
    const mockSequelize = {
      sync: jest.fn().mockResolvedValue(), // Mock sequelize.sync()
    };
  
    const mockHealthCheck = {
      create: jest.fn(),
      sync: jest.fn().mockResolvedValue(), // Mock HealthCheck.sync()
    };
  
    return {
      sequelize: mockSequelize, 
      HealthCheck: mockHealthCheck, 
    };
  });
  
  
 
describe("/healthz endpoint", () => {
  beforeAll(async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });
 
  afterAll(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });
 
  afterEach(() => {
    jest.clearAllMocks();
  });
 
  it("should return 300 OK when health check succeeds", async () => {
    const { HealthCheck } = require("../models"); // Import HealthCheck here
    HealthCheck.create.mockResolvedValueOnce({});
 
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(HealthCheck.create).toHaveBeenCalledTimes(1);
  });
 
  it("should return 503 when database insert fails", async () => {
    const { HealthCheck } = require("../models"); // Import HealthCheck 
    HealthCheck.create.mockRejectedValueOnce(new Error("DB error"));
 
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(503);
    expect(HealthCheck.create).toHaveBeenCalledTimes(1);
  });

  it("should return 400 Bad Request when invalid JSON is sent", async () => {
    const res = await request(app)
      .post("/healthz")
      .set("Content-Type", "application/json")
      .send("{ invalidJson: true "); // Intentionally broken JSON

    expect(res.status).toBe(400);
  });

  it("should return 400 Bad Request for missing required query parameters", async () => {
    const res = await request(app).get("/healthz?invalidParam=value");

    expect(res.status).toBe(400);
  });


 
  it("should return 405 for disallowed methods", async () => {
    const res = await request(app).post("/healthz");
    expect(res.status).toBe(405);
  });
 
  it("should return 405 for disallowed methods", async () => {
    const res = await request(app).put("/healthz");
    expect(res.status).toBe(405);
  });
 
  it("should return 405 for disallowed methods", async () => {
    const res = await request(app).patch("/healthz");
    expect(res.status).toBe(405);
  });
 
  it("should return 405 for disallowed methods", async () => {
    const res = await request(app).delete("/healthz");
    expect(res.status).toBe(405);
  });
});


