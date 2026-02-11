import { UserRepository } from "../../repositories/user-repository.js";
import { UserService } from "../../services/user-service.js";
import type { User } from "../../models/user.js";

describe('SimulationService', () => {

    it('Should complete simulation after 5 seconds', async () => {
        jest.useFakeTimers();

        const userRepository = new UserRepository();
        const userService = new UserService(userRepository);

        const promise = userService.simulation();

        jest.advanceTimersByTime(5000);

        await expect(promise).resolves.toBe("Completed Task");
    })
})