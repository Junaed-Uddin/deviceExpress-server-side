const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware 
app.use(cors());
app.use(express.json());

// database setup 
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.t0pnxex.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// Collections
const Users = client.db("deviceExpress").collection("Users");

// database connected 
async function dbConnect() {
    try {
        await client.connect();
        console.log('database connected')
    } catch (error) {
        console.log(error.name, error.message);
    }
}

dbConnect();

app.post('/users', async(req, res) => {
    try {
        const user = req.body;
        const result = await Users.insertOne(user);
        if (result.insertedId) {
            res.send({
                success: true,
                message: `${user.name} Successfully Registered`
            })
        }
        else {
            res.send({
                success: false,
                message: `User wouldn't successfully created`
            })
        }
    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
});



// route endpoint test
app.get('/', async (req, res) => {
    res.send(`DeviceExpress server is running`);
});

app.listen(port, () => {
    console.log(`DeviceExpress server is running on ${port}`);
})

