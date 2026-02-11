import supertest from "supertest";
import app from "../../app.js";

describe("UserRegister", () => {
    it("Should return a succesful register object", async () => {
        const response = await supertest(app).post("/user/v1/register").send({
            email: "hugo@test.com",
            username: "hugo",
            password: "UnaContrasenaMuyLarga123", // Larga para que el servidor la acepte (200)
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
            password: "", // Vacía para forzar el error "Password is needed" (400)
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