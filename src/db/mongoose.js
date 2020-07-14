const mongoose = require('mongoose');

const connectionURL = process.env.MONGODB_URL;
const dbOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
}

mongoose.connect(connectionURL, dbOptions);