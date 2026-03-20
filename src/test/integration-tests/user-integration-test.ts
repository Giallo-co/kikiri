import supertest from "supertest";
import app from "../../app.js";

describe("UserRegister", () => {
    it("Should return a succesful register object", async () => {
        const response = await supertest(app).post("/user/v1/register").send({
            email: "philipfallag@gmail.com",
            username: "Philip",
            password: "12345678",
        });

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        expect(response.body).toHaveProperty("email");
    });
});

describe("Password Validation", () => {
    it("Should return an invalid password error", async () => {
        const response = await supertest(app).post("/user/v1/register").send({
            email: "philipfallag@gmail.com",
            username: "Philip",
            password: "12345",
        });

        expect(response.status).toBe(400);
    });
});