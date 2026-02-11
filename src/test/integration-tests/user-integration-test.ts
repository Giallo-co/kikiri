import supertest from "supertest";
import app from "../../app.js";

describe("UserRegister", () => {
    it("Should return a succesful register object", async () => {
        const response = await supertest(app).post("/user/v1/register").send({
            email: "hugo@test.com",
            username: "hugo",
            password: "UnaContrasenaMuyLarga123", 
        });

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body).toHaveProperty("email");
    });
});

describe("Password Validation", () => {
    it("Should return an invalid password error", async () => {
        const response = await supertest(app).post("/user/v1/register").send({
            email: "hugo@test.com",
            username: "hugo",
            password: "", 
        });

        expect(response.status).toBe(400);
    });
});

describe("Root Endpoint", () => {
    it("Should return 200 and Hello World from root", async () => {
        const response = await (supertest as any)(app).get("/");
        expect(response.status).toBe(200);
        expect(response.text).toContain("Hello World");
    });
});

it("Should return 404 for non-existent routes", async () => {
    
    const response = await (supertest as any)(app).get("/esta-ruta-no-existe");
    
    expect(response.status).toBe(404);
  });