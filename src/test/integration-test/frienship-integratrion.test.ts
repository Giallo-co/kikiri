import request from 'supertest';
import app from '../../app';
import prisma from '../../lib/prisma';

const simulateExecution = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 500));

describe('Follow API Integration Flow', () => {
  let userId: number;
  let targetIdA: number;
  let targetIdB: number;
  let authToken: string; // Token del usuario principal

  afterAll(async () => {
    // Limpiar los datos de prueba al terminar
    await prisma.follow.deleteMany();
    await prisma.user.deleteMany({
        where: { email: { contains: '@kikiri.com' } }
    });
    
    await prisma.$disconnect();
  });

  it('should register a user and targets first', async () => {
    await simulateExecution();
    
    // Crear un usuario principal
    const res = await request(app).post('/user/v1/register').send({
      email: `social_${Date.now()}@kikiri.com`,
      username: `SocialUser_${Date.now()}`,
      password: "password123"
    });
    expect(res.status).toBe(201);
    userId = res.body.user.id;
    authToken = res.body.token;

    // Usuario a seguir A
    const resTargetA = await request(app).post('/user/v1/register').send({
      email: `targetA_${Date.now()}@kikiri.com`,
      username: `TargetA_${Date.now()}`,
      password: "password123"
    });
    targetIdA = resTargetA.body.user.id;

    // Usuario a seguir B
    const resTargetB = await request(app).post('/user/v1/register').send({
      email: `targetB_${Date.now()}@kikiri.com`,
      username: `TargetB_${Date.now()}`,
      password: "password123"
    });
    targetIdB = resTargetB.body.user.id;
  });

  it('should follow a user (POST /user/v1/users/:userId/follow/:targetId)', async () => {
    await simulateExecution();
    const res = await request(app)
        .post(`/user/v1/users/${userId}/follow/${targetIdA}`)
        .set('Authorization', `Bearer ${authToken}`); // Enviamos el token

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Successfully followed user.");
  });

  it('should not allow following the same user twice', async () => {
    await simulateExecution();
    const res = await request(app)
        .post(`/user/v1/users/${userId}/follow/${targetIdA}`)
        .set('Authorization', `Bearer ${authToken}`);

    // Debería fallar porque la BD rechaza el duplicado (llave primaria compuesta)
    expect(res.status).not.toBe(200); 
  });

  it('should get following list (GET /user/v1/users/:userId/following)', async () => {
    await simulateExecution();
    // Seguimos al segundo usuario
    await request(app)
        .post(`/user/v1/users/${userId}/follow/${targetIdB}`)
        .set('Authorization', `Bearer ${authToken}`);

    const res = await request(app)
        .get(`/user/v1/users/${userId}/following`)
        .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    // Verificamos que el arreglo `following` contenga ambos IDs
    expect(res.body.following).toContain(targetIdA);
    expect(res.body.following).toContain(targetIdB);
  });

  it('should unfollow a specific user (DELETE /user/v1/users/:userId/follow/:targetId)', async () => {
    await simulateExecution();
    const res = await request(app)
        .delete(`/user/v1/users/${userId}/follow/${targetIdA}`)
        .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Successfully unfollowed user.");
    
    // Verificamos que realmente se haya eliminado de la lista
    const verifyRes = await request(app)
        .get(`/user/v1/users/${userId}/following`)
        .set('Authorization', `Bearer ${authToken}`);
        
    expect(verifyRes.body.following).not.toContain(targetIdA);
    expect(verifyRes.body.following).toContain(targetIdB);
  });
});