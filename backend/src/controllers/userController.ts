import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';
import { ServiceException } from '../errors/ServiceException'; //estos no se usan, pero igual los dejo
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

    // resto de metodos CRUD
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

    public simulate = (_req: Request, _res: Response) => {
        this.userService.simulation();
        _res.send("Success (～￣▽￣)～");
    }

    public addFriend = async (req: Request, res: Response, next: NextFunction) => {
        const { userId, friendId } = req.body;
        try {
            const updatedUser = await this.userService.addFriendAsync(userId, friendId);
            res.status(200).json(updatedUser);
        } catch (error) {
            next(error); 
        }
    }

    public getFriends = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = Number(req.params.userId);
            const friends = await this.userService.getFriends(userId);
            res.status(200).json({ friends });
        } catch (error) { next(error); }
    }

    public deleteFriend = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = Number(req.params.userId);
            const friendId = Number(req.params.friendId);
            
            const updatedUser = await this.userService.removeFriend(userId, friendId);
            res.status(200).json(updatedUser);
        } catch (error) { next(error); }
    }

    public updateFriendList = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = Number(req.params.userId);
            const { friends } = req.body; // Espera un array { "friends": [1, 2, 3] }

            if (!Array.isArray(friends)) {
                return res.status(400).json({ message: "Friends must be an array of numbers" });
            }

            const updatedUser = await this.userService.updateFriendList(userId, friends);
            res.status(200).json(updatedUser);
        } catch (error) { next(error); }
    }

}
