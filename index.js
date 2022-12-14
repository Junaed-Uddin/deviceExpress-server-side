const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId, Admin } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
const Payments = client.db("deviceExpress").collection("Payments");
const Booking = client.db("deviceExpress").collection("Booking");
const ReportedItems = client.db("deviceExpress").collection("ReportedItems");
const CustomerReview = client.db("deviceExpress").collection("CustomerReview");

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
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '7d' });
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

// verify admin 
const verifyAdmin = async (req, res, next) => {
    const decodedEmail = req.decoded.email;
    const query = { email: decodedEmail };
    const users = await Users.findOne(query);

    if (users?.role !== 'admin') {
        return res.status(403).send({ message: 'Forbidden Access' });
    }
    next();
}

// check seller
app.get('/users/seller/:email', verifyJWT, async (req, res) => {
    try {
        const { email } = req.params;
        const query = { email };
        const user = await Users.findOne(query);
        res.send({
            success: true,
            isSeller: user?.role === 'Seller'
        })

    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
});

// verify seller 
const verifySeller = async (req, res, next) => {
    const decodedEmail = req.decoded.email;
    const query = { email: decodedEmail };
    const users = await Users.findOne(query);

    if (users?.role !== 'Seller') {
        return res.status(403).send({ message: 'Forbidden Access' });
    }
    next();
}

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
app.get('/category/:name', verifyJWT, async (req, res) => {
    try {
        const { name } = req.params;
        const query = { category_name: name, status: 'available' };
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

// post reported items
app.post('/reportItems', verifyJWT, async (req, res) => {
    try {
        const reportProduct = req.body;

        const productId = reportProduct.productId;
        const filter = { _id: ObjectId(productId) };
        const products = await Products.findOne(filter);

        if (products) {
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    reported: 'yes'
                }
            }

            const report = await Products.updateOne(filter, updateDoc, options);
            const result = await ReportedItems.insertOne(reportProduct);

            if (result.insertedId && report.matchedCount) {
                res.send({
                    success: true,
                    message: `${reportProduct.productName} reported to Admin`
                })
            }
            else {
                res.send({
                    success: false,
                    message: `Not successfully reported to admin`
                })
            }
        }

    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
});

// get reported items
app.get('/reportItems', verifyJWT, verifyAdmin, async (req, res) => {
    try {
        const query = {};
        const reportData = await ReportedItems.find(query).toArray();
        res.send({
            success: true,
            data: reportData
        })

    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
});

// reported item delete
app.delete('/reportedItem/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = { _id: ObjectId(id) };
        const result = await ReportedItems.deleteOne(query);

        if (result.deletedCount) {
            res.send({
                success: true,
                message: `Deleted successfully`
            })
        }
        else {
            res.send({
                success: true,
                message: `Couldn't deleted successfully`
            })
        }
    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
})

//add products
app.post('/category', verifyJWT, verifySeller, async (req, res) => {
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

// my products data
app.get('/category', verifyJWT, verifySeller, async (req, res) => {
    try {

        const { email } = req.query;
        const query = { email: email };
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
})

//add property advertisement
app.put('/productAdvertise/:id', verifyJWT, verifySeller, async (req, res) => {
    try {
        const { id } = req.params;
        const filter = { _id: ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
            $set: {
                display: 'advertise'
            }
        }
        const result = await Products.updateOne(filter, updateDoc, options);
        if (result.matchedCount) {
            res.send({
                success: true,
                message: `Advertise Product to display`
            })
        }
        else {
            res.send({
                success: false,
                message: 'Something went wrong'
            })
        }

    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
});

// get advertise product 
app.get('/product/advertise', async (req, res) => {
    try {
        const query = { display: 'advertise', status: 'available' };
        const advertisementProducts = await Products.find(query).toArray();
        res.send({
            success: true,
            data: advertisementProducts
        })

    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
});

// delete product (sold) data
app.delete('/soldProduct/:id', verifyJWT, verifySeller, async (req, res) => {
    try {
        const { id } = req.params;
        const query = { _id: ObjectId(id) };
        const result = await Products.deleteOne(query);
        if (result.deletedCount) {
            res.send({
                success: true,
                message: `Product Deleted Successfully`
            })
        }
        else {
            res.send({
                success: false,
                message: `Wont't deleted. try again`
            })
        }

    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
});

//get all buyers
app.get('/users/buyer', verifyJWT, verifyAdmin, async (req, res) => {
    try {
        const query = { role: 'Buyer' };
        const buyers = await Users.find(query).toArray();
        res.send({
            success: true,
            data: buyers
        })

    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
});

// buyer delete 
app.delete('/buyerDelete/:id', verifyJWT, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const query = { _id: ObjectId(id) };
        const result = await Users.deleteOne(query);
        if (result.deletedCount) {
            res.send({
                success: true,
                message: `User Successfully Deleted`
            })
        }
        else {
            res.send({
                success: false,
                message: `Something went wrong`
            })
        }

    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
})

//get all sellers
app.get('/users/seller', verifyJWT, verifyAdmin, async (req, res) => {
    try {
        const query = { role: 'Seller' };
        const sellers = await Users.find(query).toArray();
        res.send({
            success: true,
            data: sellers
        })

    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
});

// seller delete 
app.delete('/deleteSellers/:id', verifyJWT, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const query = { _id: ObjectId(id) };
        const result = await Users.deleteOne(query);
        if (result.deletedCount) {
            res.send({
                success: true,
                message: `Seller Successfully Deleted`
            })
        }
        else {
            res.send({
                success: false,
                message: `Something went wrong`
            })
        }

    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
});

//verified 
app.put('/userVerified/:email', verifyJWT, verifyAdmin, async (req, res) => {
    try {
        const { email } = req.params;
        const filter = { email: email };
        const options = { upsert: true };
        const updateDoc = {
            $set: {
                verified: 'yes'
            }
        }

        const result1 = await Users.updateOne(filter, updateDoc, options);
        const result2 = await Products.updateMany(filter, updateDoc, options);
        if (result1.matchedCount && result2.matchedCount) {
            res.send({
                success: true,
                message: `Seller verified`
            })
        }
        else {
            res.send({
                success: false,
                message: `Something went wrong`
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
app.post('/booking', verifyJWT, async (req, res) => {
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


//my orders
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

// get specific booking data
app.get('/booking/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = { _id: ObjectId(id) };
        const booking = await Booking.findOne(query);
        res.send({
            success: true,
            data: booking
        })

    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
});

// payment intent
app.post('/create-payment-intent', verifyJWT, async (req, res) => {
    const bookingPayment = req.body;
    const price = bookingPayment.resalePrice;
    const amount = price * 100;

    const paymentIntent = await stripe.paymentIntents.create({
        currency: "bdt",
        amount: amount,
        "payment_method_types": [
            "card"
        ],
    });

    res.send({
        clientSecret: paymentIntent.client_secret,
    });
});

// payment info stored
app.post('/payments', async (req, res) => {
    try {
        const payment = req.body;
        const result = await Payments.insertOne(payment);

        const bookingId = payment.bookingId;
        const filter = { _id: ObjectId(bookingId) };
        const options = { upsert: true };
        const updateDoc = {
            $set: {
                paid: true,
                transactionId: payment.transactionId
            }
        }

        const productId = payment.productId;
        const query = { _id: ObjectId(productId) };
        const updateStatus = {
            $set: {
                status: 'unavailable'
            }
        }

        const booking = await Booking.updateOne(filter, updateDoc, options);
        const productInfoUpdate = await Products.updateOne(query, updateStatus, options);

        if (result.insertedId && booking.matchedCount && productInfoUpdate.matchedCount) {
            res.send({
                success: true,
                message: `Successfully completed the payment`
            })
        }
        else {
            res.send({
                success: false,
                message: `Payment couldn't successfully completed. please try again`
            })
        }

    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
});

// user reviews
app.get('/userReviews', async (req, res) => {
    try {
        const query = {};
        const reviews = await CustomerReview.find(query).toArray();
        res.send({
            success: true,
            data: reviews
        })

    } catch (error) {
        res.send({
            success: false,
            message: error.message
        })
    }
})


// route endpoint test
app.get('/', async (req, res) => {
    res.send(`DeviceExpress server is running`);
});

app.listen(port, () => {
    console.log(`DeviceExpress server is running on ${port}`);
})

