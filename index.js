const express = require('express')
const bodyParser = require('body-parser');
const ObjectId = require('mongodb').ObjectId;
const cors = require('cors');
const admin = require('firebase-admin');
const fileUpload = require('express-fileupload')
const MongoClient = require('mongodb').MongoClient;
const fs = require('fs-extra')
require('dotenv').config()

var serviceAccount = require("./configs/creative-agency-committee-firebase-adminsdk-9rozs-dc12cf1d47.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIRE_DB
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v8gxk.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;


const app = express()

app.use(bodyParser.json());
app.use(cors());
app.use(express.static('images'));
app.use(fileUpload());



const port = 5000;

app.get('/', (req, res) => {
  res.send('Hello from db its working working')
})

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
  const serviceCollection = client.db("egency").collection("services");
  const reviewCollection = client.db("egency").collection("reviews");
  const orderCollection = client.db("egency").collection("orders");
  const adminCollection = client.db("egency").collection("admin");


  console.log("database connected")

  app.post('/addServices', (req, res) => {
    const title = req.body.title;
    const description = req.body.description;
    const file = req.files.file;
    const newImg = file.data;
    const encImg = newImg.toString('base64');

    var authorImg = {
      contentType: file.mimetype,
      size: file.size,
      img: Buffer.from(encImg, 'base64')
    };
    serviceCollection.insertOne({ title, description, authorImg })
      .then(result => {
        res.send(result.insertedCount > 0);
      })
  })

  app.post('/addReviews', (req, res) => {
    const author = req.body.author;
    const designation = req.body.designation;
    const description = req.body.description;
    const authorImg = req.body.authorImg;
    reviewCollection.insertOne({ author, designation, description, authorImg })
      .then(result => {
        res.send(result.insertedCount > 0);
      })
  })

  app.get('/services', (req, res) => {
    serviceCollection.find({})
      .toArray((err, documents) => {
        res.send(documents);
      })
  })

  app.get('/reviews', (req, res) => {
    reviewCollection.find({})
      .toArray((err, documents) => {
        res.send(documents);
      })
  })

  app.post('/addOrders', (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const projectDetails = req.body.projectDetails;
    const orderName = req.body.orderName;
    const price = req.body.price;
    const authorImg = req.body.authorImg;
    const description = req.body.description;
    const status = 'Pending';
    console.log(req.files)
    if (req.files) {
      const file = req.files.file;
      const newImg = file.data;
      const encImg = newImg.toString('base64');
      var image = {
        contentType: file.mimetype,
        size: file.size,
        img: Buffer.from(encImg, 'base64')
      };
      orderCollection.insertOne({ name, email, orderName, price, projectDetails, image, authorImg, description, status })
        .then(result => {
          res.send(result.insertedCount > 0);
        })
    }
    else {
      orderCollection.insertOne({ name, email, orderName, price, projectDetails, authorImg, description, status })
        .then(result => {
          res.send(result.insertedCount > 0);
        })
    }

  })

  app.post('/addAdmin', (req, res) => {
    const admin = req.body;
    console.log(admin)
    adminCollection.insertOne(admin)
      .then(result => {
        res.send(result.insertedCount > 0);
      })
  })

  app.post('/isAdmin', (req, res) => {
    const email = req.body.email;
    adminCollection.find({ email: email })
      .toArray((err, admin) => {
        res.send(admin.length > 0);
      })
  })

  app.get('/orders', (req, res) => {
    const bearer = req.headers.authorization;
    console.log(bearer);
    if (bearer && bearer.startsWith('Bearer ')) {
      const idToken = bearer.split(' ')[1];
      admin.auth().verifyIdToken(idToken)
        .then(function (decodedToken) {
          const tokenEmail = decodedToken.email;
          const queryEmail = req.query.email;
          console.log(tokenEmail, queryEmail);
          if (tokenEmail == queryEmail) {
            orderCollection.find({ email: queryEmail })
              .toArray((err, documents) => {
                res.status(200).send(documents);
              })
          }
        }).catch(function (error) {
          res.status(401).send('Un authorized access')
        });
    }
    else if (bearer) {
      orderCollection.find({})
        .toArray((err, documents) => {
          res.send(documents);
        })
    }
    else {
      res.status(401).send('Un authorized access')
    }
  })

  app.patch('/update/:id', (req, res) => {
    orderCollection.updateOne({ _id: ObjectId(req.params.id) },
      {
        $set: { status: req.body.status }
      })
      .then(result => {
        res.send(result.modifiedCount > 0)
      })
  })


});

app.listen(process.env.PORT || port)