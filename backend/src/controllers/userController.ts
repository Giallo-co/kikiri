import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';
import { ServiceException } from '../errors/ServiceException';
import { User } from '../models/user'; 

export class UserController {
    constructor(private readonly userService: UserService) {}

public async register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, username, password, role } = req.body as {
      email: string;
      username: string;
      password: string;
      role?: number;
    };

    const newUser = await this.userService.registerUserAsync({
      email,
      username,
      password,
      role: role ?? 0  
    });

    res.status(201).json({
      message: "User registered successfully",
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      password: newUser.password,
      role: newUser.role
    });

  } catch (error) {
    next(error);
  }
}

}
