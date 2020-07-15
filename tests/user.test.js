const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const User = require('../src/models/user');
const { userOneId, userOne, setupDatabase } = require('./fixtures/db');

const missingUserData = [{
    email: 'invalid@example.com',
    password: "NoPass555$"
}, {
    name: 'Invalid User',
    password: "NoPass555$"
}, {
    name: 'Invalid User',
    email: 'invalid@example.com'
}];

const invalidEmailAddresses = ['invalid@example', 'invalid.com', 'invalid@example..com', '@abc.com']
const invalidPasswords = ['123', 'Mypass', 'password', 'abcPassworD123']
const invalidAges = ['abc', -1]

const supportedAvatarFiles = [
    'tests/fixtures/profile-pic.jpg',
    'tests/fixtures/philly.jpeg',
    'tests/fixtures/sun.png'
]

const unsupportedAvatarFiles = [
    'tests/fixtures/sample-pdf-file.pdf',
    'tests/fixtures/sample-doc-file.doc',
    'tests/fixtures/sample-docx-file.docx'
]

const invalidUpdates = () => {
    const updateObjects = [];

    invalidEmailAddresses.forEach(email => updateObjects.push({ email }));
    invalidPasswords.forEach(password => updateObjects.push({ password }));
    invalidAges.forEach(age => updateObjects.push({ age }));

    return updateObjects;
}

describe('/users', () => {
    beforeEach(setupDatabase);

    describe('POST /users', () => {
        it('Should signup a new user with valid data', async () => {
            const response = await request(app)
                .post('/users')
                .send({
                    name: 'Andrew',
                    email: 'andrew@example.com',
                    password: "MyPass777!"
                })
                .expect(201)

            const user = await User.findById(response.body.user._id);
            expect(user).not.toBeNull();

            expect(response.body).toMatchObject({
                user: {
                    name: 'Andrew',
                    email: 'andrew@example.com'
                },
                token: user.tokens[0].token
            });

            expect(user.password).not.toBe('MyPass777!');
        });

        it.each(missingUserData)('Should not signup a user with incomplete data set: %s', async (data) => {
            await request(app)
                .post('/users')
                .send(data)
                .expect(400)

            const user = await User.findOne({ email: data.email });
            expect(user).toBeNull();
        });

        it.each(invalidEmailAddresses)('Should not signup a user with an invalid email address: %s', async (data) => {
            const invalidUser = {
                name: 'Invalid user',
                email: data,
                password: "NoPass555$"
            };

            await request(app)
                .post('/users')
                .send(invalidUser)
                .expect(400)

            const user = await User.findOne({ email: invalidUser.email });
            expect(user).toBeNull();
        });

        it.each(invalidPasswords)('Should not signup a user with an invalid password: %s', async (password) => {
            const invalidUser = {
                name: 'Invalid user',
                email: 'invalid@example.com',
                password
            };

            await request(app)
                .post('/users')
                .send(invalidUser)
                .expect(400)

            const user = await User.findOne({ email: invalidUser.email });
            expect(user).toBeNull();
        });

        it('Should not signup a user with an email address that is already registered', async () => {
            const duplicateUser = {
                name: 'Duplicate user',
                email: userOne.email,
                password: "myAwesomePassword"
            };

            await request(app)
                .post('/users')
                .send(duplicateUser)
                .expect(400)

            const user = await User.findOne({ name: duplicateUser.name });
            expect(user).toBeNull();
        });
    });

    describe('POST /users/login', () => {
        it('Should login existing user with valid password', async () => {
            const response = await request(app)
                .post('/users/login')
                .send({
                    email: userOne.email,
                    password: userOne.password
                })
                .expect(200)

            const user = await User.findById(userOneId);
            expect(response.body.token).toBe(user.tokens[1].token)
        });

        it('Should not login non-existent user', async () => {
            await request(app)
                .post('/users/login')
                .send({
                    email: 'noOne@example.com',
                    password: '1234'
                })
                .expect(400);
        });

        it('Should not login existing user with incorrect password', async () => {
            await request(app)
                .post('/users/login')
                .send({
                    email: userOne.email,
                    password: 'forgottenSecret'
                })
                .expect(400);
        });
    });

    describe('GET /users/me', () => {
        it('Should get profile for authenticated user', async () => {
            await request(app)
                .get('/users/me')
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .send()
                .expect(200);
        });

        it('Should not get profile for unauthenticated user', async () => {
            await request(app)
                .get('/users/me')
                .send()
                .expect(401);
        });
    });

    describe('DELETE /users/me', () => {
        it('Should delete account for authenticated user', async () => {
            await request(app)
                .delete('/users/me')
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .send()
                .expect(200);

            const user = await User.findById(userOneId);
            expect(user).toBeNull();
        });

        it('Should not delete account for unauthenticated user', async () => {
            await request(app)
                .delete('/users/me')
                .send()
                .expect(401);
        });
    });

    describe('PATCH /users/me', () => {
        it('Should update valid user fields', async () => {
            const updatedFields = {
                name: 'Test User',
                email: 'testUser@example.net',
                password: '1234pWd',
                age: 30
            };

            await request(app)
                .patch('/users/me')
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .send(updatedFields)
                .expect(200)

            const user = await User.findById(userOneId);

            expect(user).toEqual(expect.objectContaining({
                name: updatedFields.name.trim(),
                email: updatedFields.email.trim().toLowerCase(),
                age: updatedFields.age
            }));

            expect(await bcrypt.compare(updatedFields.password, user.password)).toBe(true);
        });

        it('Should not update invalid user fields', async () => {
            await request(app)
                .patch('/users/me')
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .send({
                    location: 'Chicago',
                    dob: '01/01/70'
                })
                .expect(400)

            const user = await User.findById(userOneId);

            expect(user).not.toHaveProperty('location');
            expect(user).not.toHaveProperty('dob');
        });

        it.each(invalidUpdates())('Should not update valid fields with invalid data: %s', async (data) => {
            await request(app)
                .patch('/users/me')
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .send(data)
                .expect(400)

            const user = await User.findById(userOneId);

            expect(user.email).toEqual(userOne.email);
            expect(user.age).toEqual(userOne.age || 0);
            expect(await bcrypt.compare(userOne.password, user.password)).toBe(true);
        });
    });

    describe('POST /users/me/avatar', () => {
        it.each(supportedAvatarFiles)('Should upload supported image files: %s', async (file) => {
            await request(app)
                .post('/users/me/avatar')
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .attach('avatar', file)
                .expect(200)

            const user = await User.findById(userOneId);
            expect(user.avatar).toEqual(expect.any(Buffer));
        });

        it('Should not upload supported file that is too large', async () => {
            await request(app)
                .post('/users/me/avatar')
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .attach('avatar', 'tests/fixtures/tooBig.jpg')
                .expect(400)

            const user = await User.findById(userOneId);
            expect(user.avatar).toBe(undefined);
        });

        it.each(unsupportedAvatarFiles)('Should not upload unsupported files: %s', async (file) => {
            await request(app)
                .post('/users/me/avatar')
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .attach('avatar', file)
                .expect(400)

            const user = await User.findById(userOneId);
            expect(user.avatar).toBe(undefined);
        });
    });

    describe('DELETE /users/me/avatar', () => {
        it('Should delete the avatar image', async () => {
            let userOneDb = await User.findById(userOneId);
            userOneDb.avatar = 'avatar place holder';
            await userOneDb.save();

            await request(app)
                .delete('/users/me/avatar')
                .set('Authorization', `Bearer ${userOneDb.tokens[0].token}`)
                .send()
                .expect(200)

            userOneDb = await User.findById(userOneId);

            expect(userOneDb).toHaveProperty('avatar', undefined);
        });
    });

    describe('GET /users/:id/avatar', () => {
        it('Should fetch the requested user avatar', async () => {
            const userOneDb = await User.findById(userOneId);
            userOneDb.avatar = 'avatar place holder';
            await userOneDb.save();

            const response = await request(app)
                .get(`/users/${userOneId}/avatar`)
                .send()
                .expect(200)

            expect(response.body).toEqual(userOneDb.avatar);
        });

        it('Should return status 404 if requested user has no avatar', async () => {
            await request(app)
                .get(`/users/${userOneId}/avatar`)
                .send()
                .expect(404)
        });

        it('Should return status 404 if requested user ID does not exist', async () => {
            await request(app)
                .get('/users/1/avatar')
                .send()
                .expect(404)
        });
    });

    describe('POST /users/logout', () => {
        it('Should log the user out of the current session', async () => {
            let userOneDb = await User.findById(userOneId);
            const currentToken = await userOneDb.generateAuthToken();

            await request(app)
                .post('/users/logout')
                .set('Authorization', `Bearer ${userOneDb.tokens[1].token}`)
                .send()
                .expect(200)

            userOneDb = await User.findById(userOneId);

            expect(userOneDb.tokens).toHaveLength(1);
            expect(userOneDb.tokens[0].token).not.toEqual(currentToken);
        });
    });

    describe('POST /users/logoutAll', () => {
        it('Should log the user out of all sessions', async () => {
            let userOneDb = await User.findById(userOneId);
            const currentToken = await userOneDb.generateAuthToken();

            await request(app)
                .post('/users/logoutAll')
                .set('Authorization', `Bearer ${userOneDb.tokens[1].token}`)
                .send()
                .expect(200)

            userOneDb = await User.findById(userOneId);

            expect(userOneDb.tokens).toHaveLength(0);
        });
    });
});
