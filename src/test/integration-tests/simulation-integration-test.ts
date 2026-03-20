import supertest from "supertest";
import app from "../../app.js";

describe("Simulation endpoint", () => {
    it("Should return Success immediately", async () => {
        const response = await supertest(app).get("/user/v1/simulation");

        expect(response.status).toBe(200);
        expect(response.text).toBe("Success");
    });
});