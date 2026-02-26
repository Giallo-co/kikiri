import { User } from '../models/user';

export class UserRepository {
  private users: User[] = [];
  private nextId: number = 1;

  async save(user: Omit<User, 'id' | 'friends'>): Promise<User> {
    const newUser: User = {
      ...user,
      id: this.nextId++,
      friends: []
    };
    this.users.push(newUser);
    return newUser;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.users.find(u => u.email === email);
  }

  async update(userId: number, update: Partial<User>): Promise<User | undefined> {
    const idx = this.users.findIndex(u => u.id === userId);
    if (idx === -1) return undefined;

    const existing = this.users[idx]!;

    const updated: User = {
        ...existing,
        ...update,
        id: existing.id,
        friends: existing.friends
    };

    this.users[idx] = updated;
    return updated;
  }

  async delete(userId: number): Promise<boolean> {
    const idx = this.users.findIndex(u => u.id === userId);
    if (idx === -1) return false;

    this.users.splice(idx, 1);
    return true;
    }

  async getUserByIdAsync(id: number): Promise<User | undefined> {
      return new Promise((resolve) => {
          setTimeout(() => {
              resolve(this.users.find(u => u.id === id));
          }, 100);
      });
  }

  callToExternalServiceAsync = async () : Promise<string> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve("External call success.");
        }, 200)
    })
  }

  async saveRelationshipAsync(user: User): Promise<void> {
      await this.callToExternalServiceAsync();
  }

}
