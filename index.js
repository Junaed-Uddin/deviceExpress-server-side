const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware 
app.use(cors());
app.use(express.json());

// database setup 
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.t0pnxex.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// Collections
const Users = client.db("deviceExpress").collection("Users");
const Categories = client.db("deviceExpress").collection("Categories");
const Products = client.db("deviceExpress").collection("Products");
const Booking = client.db("deviceExpress").collection("Booking");

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

app.post('/users', async (req, res) => {
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

// category load 
app.get('/categories', async (req, res) => {
    try {
        const query = {};
        const categories = await Categories.find(query).toArray();
        res.send({
            success: true,
            data: categories
        })

    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
});

// get products 
app.get('/category/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = { category_id: id };
        const products = await Products.find(query).toArray();
        res.send({
            success: true,
            data: products
        })

    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
});

// booking data
app.post('/booking', async (req, res) => {
    try {
        const booking = req.body;
        console.log(booking);
        const result = await Booking.insertOne(booking);
        if (result.insertedId) {
            res.send({
                success: true,
                message: `${booking.productName} laptop booked successfully`
            })
        }
        else {
            res.send({
                success: false,
                message: `Something Went Wrong`
            })
        }

    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
});

//my orders
app.get('/myOrders', async (req, res) => {
    try {
        const query = {};
        const orders = await Booking.find(query).toArray();
        res.send({
            success: true,
            data: orders
        })

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

