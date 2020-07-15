const request = require('supertest');
const app = require('../src/app');
const Task = require('../src/models/task');
const { userOne, userTwo, setupDatabase, taskOne } = require('./fixtures/db');

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
        it('Should get all tasks for userOne', async () => {
            const response = await request(app)
                .get('/tasks')
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .send()
                .expect(200)

            expect(response.body.length).toBe(2);
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
    });
});