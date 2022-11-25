const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId, Admin } = require('mongodb');
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

// jwt 
app.get('/jwt', async (req, res) => {
    try {
        const email = req.query.email;
        const query = { email: email };
        const user = await Users.findOne(query);

        if (user) {
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '2h' });
            return res.send({
                accessToken: token
            })
        }

        res.status(403).send({ accessToken: '' });

    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
});

// jwt verify middleware
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }
        req.decoded = decoded;
        next();
    })
};

// verify admin 
const verifyAdmin = async (req, res, next) => {
    console.log(req.decoded.email);
    const decodedEmail = req.decoded.email;
    const query = { email: decodedEmail };
    const users = await Users.findOne(query);

    if (users?.role !== 'admin') {
        return res.status(403).send({ message: 'Forbidden Access' });
    }
    next();
}

// check Admin
app.get('/users/admin/:email', verifyJWT, async (req, res) => {
    try {
        const { email } = req.params;
        const query = { email };
        const user = await Users.findOne(query);
        res.send({
            success: true,
            isAdmin: user?.role === 'admin'
        })

    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
});

//users stored 
app.post('/users', async (req, res) => {
    try {
        const user = req.body;
        const email = user.email;
        const query = { email: email };
        const existUser = await Users.findOne(query);
        if (!existUser) {
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
        }
        else {
            res.send({
                success: true,
                message: 'Successfully Login'
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
app.get('/category/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const query = { category_name: name };
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

//post products
app.post('/category', verifyJWT, async (req, res) => {
    try {
        const body = req.body;
        const product = await Products.insertOne(body);
        if (product.insertedId) {
            res.send({
                success: true,
                message: `${body.productName} Successfully Created`
            })
        }
        else {
            res.send({
                success: false,
                message: `Couldn't create the product`
            })
        }

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


//users order
app.get('/booking', verifyJWT, async (req, res) => {
    try {
        const email = req.query.email;

        if (email !== req.decoded.email) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }

        const query = { email: email };
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

