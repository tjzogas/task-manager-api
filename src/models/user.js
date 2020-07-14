const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Task = require('./task');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        validate(value) {
            if (!validator.isEmail(value))
                throw new Error('Email is invalid');
        },
        trim: true,
        lowercase: true,
        unique: true
    },
    age: {
        type: Number,
        default: 0,
        validate(value) {
            if (value < 0)
                throw new Error('Age must be a positive number');
        }
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: 7,
        validate(value) {
            if (validator.contains(value, 'password', { ignoreCase: true }))
                throw new Error('Password cannot contain the word "password"');
        }
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    avatar: {
        type: Buffer
    }
}, {
    timestamps: true
});

// Add virtual reference to tasks created by the user. The shared fields are the "_id" of this user instance and the id stored in the "owner"
// property of the task instance
userSchema.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'owner'
});

// add custom instance method for userSchema to remove the "password" & "tokens" properties from the user object that are returned to the user
// userSchema.methods.getPublicProfile = function() {
//     const user = this;
//     const userObject = user.toObject();

//     delete userObject.password;
//     delete userObject.tokens;

//     return userObject;
// }

// add custom instance method for userSchema to remove the "password" & "tokens" properties from any JSON stringify activities performed on
// the user object
userSchema.methods.toJSON = function() {
    const user = this;
    const userObject = user.toObject();

    delete userObject.password;
    delete userObject.tokens;
    delete userObject.avatar;

    return userObject;
}

// add custom instance method for userSchema (accessible via user.generateAuthToken())
userSchema.methods.generateAuthToken = async function () {
    const user = this;
    const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET)

    user.tokens = user.tokens.concat({ token });
    await user.save();

    return token;
}

// add custom class method for userSchema (accessible via User.findByCredentials())
userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email });

    if (!user)
        throw new Error('Unable to login');

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
        throw new Error('Unable to login');

    return user;
}

// Middleware to hash plain-text password before saving document. Works when new user is added or existing user updates password
userSchema.pre('save', async function (next) {
    const user = this;

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8);
    }
    next();
});

// Middleware to delete all tasks associated with a user that is removed/deleted
userSchema.pre('remove', async function (next) {
    const user = this;
    await Task.deleteMany({ owner: user._id });
    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;