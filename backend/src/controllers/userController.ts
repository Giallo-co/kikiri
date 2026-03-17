import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';

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

    public async getByEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const email = req.params.email as string;
            if (!email) return res.status(400).json({ message: "Email parameter is required" });
            const user = await this.userService.getUserByEmail(email);
            if (!user) return res.status(404).json({ message: "User not found" });
            res.json(user);
        } catch (error) {
            next(error);
        }
    }

    public async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = Number(req.params.id);
    
            if (isNaN(id)) {
                return res.status(400).json({ message: "Invalid user id" });
            }
    
            const user = await this.userService.getUserById(id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            return res.status(200).json(user);
        } catch (error) {
            next(error);
        }
    }

    public async update(req: Request, res: Response, next: NextFunction) {
        try {
            const updatedUser = await this.userService.updateUser(Number(req.params.id), req.body);
            res.json(updatedUser);
        } catch (error) {
            next(error);
        }
    }

    public async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await this.userService.deleteUser(Number(req.params.id));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    public simulate = (_req: Request, res: Response) => {
        this.userService.simulation();
        res.send("Success");
    }

    public follow = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = Number(req.params.userId);
            const targetId = Number(req.params.targetId);
            await this.userService.followUser(userId, targetId);
            res.status(200).json({ message: "Successfully followed user." });
        } catch (error) {
            next(error); 
        }
    }

    public unfollow = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = Number(req.params.userId);
            const targetId = Number(req.params.targetId);
            await this.userService.unfollowUser(userId, targetId);
            res.status(200).json({ message: "Successfully unfollowed user." });
        } catch (error) { 
            next(error); 
        }
    }

    public getFollowing = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = Number(req.params.userId);
            const following = await this.userService.getFollowing(userId);
            res.status(200).json({ following });
        } catch (error) { 
            next(error); 
        }
    }
}