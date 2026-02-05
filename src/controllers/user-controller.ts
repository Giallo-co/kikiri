import type { User } from "../models/user.js";
import type { UserService } from "../services/user-service.js";
import type { Request, Response } from "express";

export class UserController {
    constructor(private readonly userService: UserService) {
        console.log('Initilized user controller')
    }

    registerUser = async (_req : Request, _res : Response) => {
        let user : User = _req.body;
        let registeredUser = await this.userService.registerUserAsync(user);

        _res.json(registeredUser);
    }

    simulate = (_req : Request, _res : Response) => {
        this.userService.simulation();

        _res.send("Success");
    }
}