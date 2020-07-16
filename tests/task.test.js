const request = require('supertest');
const app = require('../src/app');
const Task = require('../src/models/task');
const { userOne, userTwo, setupDatabase, taskOne, taskTwo, taskThree } = require('./fixtures/db');

describe('/tasks', () => {
    beforeEach(setupDatabase);

    describe('POST /tasks', () => {
        it('Should create task for user', async () => {
            const response = await request(app)
                .post('/tasks')
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .send({
                    description: 'From my test'
                })
                .expect(201)

            const task = await Task.findById(response.body._id);

            expect(task).not.toBeNull();
            expect(task.completed).toBe(false);
        });
    });

    describe('GET /tasks', () => {
        it('Should get all tasks for a user', async () => {
            const response = await request(app)
                .get('/tasks')
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .send()
                .expect(200)

            expect(response.body).toHaveLength(2);
        });

        it('Should filter out completed tasks owned by user', async () => {
            const response = await request(app)
                .get('/tasks?completed=false')
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .send()
                .expect(200)

            expect(response.body).toHaveLength(1);
            expect(response.body[0].description).toEqual(taskOne.description);
        });

        it('Should filter out uncompleted tasks owned by user', async () => {
            const response = await request(app)
                .get('/tasks?completed=true')
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .send()
                .expect(200)

            expect(response.body).toHaveLength(1);
            expect(response.body[0].description).toEqual(taskTwo.description);
        });

        it('Should sort tasks by specified criteria in ascending order', async () => {
            const response = await request(app)
                .get('/tasks?sortBy=createdAt:asc')
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .send()
                .expect(200)

            expect(response.body[0].description).toBe(taskOne.description);
            expect(response.body[1].description).toBe(taskTwo.description);
        });

        it('Should sort tasks by specified criteria in descending order', async () => {
            const response = await request(app)
                .get('/tasks?sortBy=description:desc')
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .send()
                .expect(200)

            expect(response.body[0].description).toBe(taskTwo.description);
            expect(response.body[1].description).toBe(taskOne.description);
        });

        it('Should limit tasks returned to 1', async () => {
            const response = await request(app)
                .get('/tasks?limit=1')
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .send()
                .expect(200)

            expect(response.body).toHaveLength(1);
            expect(response.body[0].description).toEqual(taskOne.description);
        });

        it('Should limit tasks returned to 1 and skip the first task', async () => {
            const response = await request(app)
                .get('/tasks?limit=1&skip=1')
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .send()
                .expect(200)

            expect(response.body).toHaveLength(1);
            expect(response.body[0].description).toEqual(taskTwo.description);
        });
    });

    describe('GET /tasks/:id', () => {
        it('Should get a specific task owned by the user', async () => {
            const response = await request(app)
                .get(`/tasks/${taskTwo._id}`)
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .send()
                .expect(200)

            expect(response.body.description).toBe(taskTwo.description);
        });

        it('Should not get a task owned by a different user', async () => {
            await request(app)
                .get(`/tasks/${taskTwo._id}`)
                .set('Authorization', `Bearer ${userTwo.tokens[0].token}`)
                .send()
                .expect(404)
        });
    });

    describe('PATCH /tasks/:id', () => {
        it('Should update valid task fields with valid data for a specific task', async () => {
            const updatedFields = {
                description: '1st task',
                completed: true
            };

            const response = await request(app)
                .patch(`/tasks/${taskOne._id}`)
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .send(updatedFields)
                .expect(200)

            const task = await Task.findById(taskOne._id);

            expect(task).toEqual(expect.objectContaining(updatedFields));
        });

        it('Should not update a task owned by another user', async () => {
            await request(app)
                .patch(`/tasks/${taskOne._id}`)
                .set('Authorization', `Bearer ${userTwo.tokens[0].token}`)
                .send({
                    description: 'Updated description',
                    completed: true
                })
                .expect(404)

            const task = await Task.findById(taskOne._id);

            expect(task).toEqual(expect.objectContaining(taskOne));
        });

        it('Should not update invalid task fields', async () => {
            await request(app)
                .patch(`/tasks/${taskTwo._id}`)
                .set('Authorization', `Bearer ${userTwo.tokens[0].token}`)
                .send({
                    title: 'Updated description',
                    done: true
                })
                .expect(400)

            const task = await Task.findById(taskTwo._id);

            expect(task).not.toHaveProperty('title');
            expect(task).not.toHaveProperty('done');
        });
    });

    describe('DELETE /tasks/:id', () => {
        it('Should not delete a task created by a different user', async () => {
            await request(app)
                .delete(`/tasks/${taskOne._id}`)
                .set('Authorization', `Bearer ${userTwo.tokens[0].token}`)
                .send()
                .expect(404)

            const task = await Task.findById(taskOne._id);
            expect(task).not.toBeNull();
        });

        it('Should delete task owned by the user', async () => {
            await request(app)
                .delete(`/tasks/${taskTwo._id}`)
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .send()
                .expect(200)

            const task = await Task.findById(taskTwo._id);
            expect(task).toBeNull();
        });
    });
});