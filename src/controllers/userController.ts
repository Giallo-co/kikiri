import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';
import { logger } from '../lib/logger';
import { getAuthUserId } from '../utils/authRequest';
import { objectReadUrl } from '../utils/mediaUrls';

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

            const authData = await this.userService.registerUserAsync({
                email,
                username,
                password,
                role: role ?? 0  
            });

            logger.info('user_registered', { userId: authData.user.id });

            res.status(201).json({
                message: "User registered successfully",
                user: authData.user,
                token: authData.token
            });

        } catch (error) {
            next(error);
        }
    }

    public async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, username, password } = req.body as {
                email?: string;
                username?: string;
                password?: string;
            };
            const identifier = username ?? email;

            if (!identifier || !password) {
                return res.status(400).json({ message: "Username/email and password are required" });
            }

            const authData = await this.userService.loginUser(identifier, password);

            logger.info('user_login', { userId: authData.user.id });

            res.status(200).json({
                message: "Login successful",
                user: authData.user,
                token: authData.token
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
            const { password, ...rest } = user;
            const profilePictureUrl = await objectReadUrl(rest.profilePictureKey ?? undefined);
            return res.status(200).json({ ...rest, profilePictureUrl });
        } catch (error) {
            next(error);
        }
    }

    public async patchProfilePicture(req: Request, res: Response, next: NextFunction) {
        try {
            const actorId = getAuthUserId(req);
            if (actorId === undefined) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            const targetId = Number(req.params.id);
            if (!Number.isFinite(targetId)) {
                return res.status(400).json({ message: 'Invalid user id' });
            }
            const { profilePictureKey } = req.body as { profilePictureKey?: string };
            const updated = await this.userService.setProfilePictureKey(actorId, targetId, profilePictureKey ?? '');
            const { password, ...rest } = updated;
            const profilePictureUrl = await objectReadUrl(rest.profilePictureKey ?? undefined);
            return res.status(200).json({
                message: 'Profile picture updated',
                user: { ...rest, profilePictureUrl }
            });
        } catch (error) {
            next(error);
        }
    }

    public async update(req: Request, res: Response, next: NextFunction) {
        try {
            const authData = await this.userService.updateUser(Number(req.params.id), req.body);
            res.status(200).json({
                message: "User updated successfully",
                user: authData.user,
                token: authData.token
            });
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