const express = require('express')
const app = express();
const userModel = require('./models/user');
const postModel = require('./models/post')
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const user = require('./models/user');

const port = 4000
const secreatkey = "recon"; 

app.set("view engine","ejs")
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser());

//Protected middleware route that ensure that if a user is not logged in then it should before doing anything
function isLoggedIn(req, res, next) {
    let verify = req.cookies.token;
    if (!verify) return res.redirect("/login")
    else {
        let data = jwt.verify(req.cookies.token, secreatkey)
        req.user= data
        next();
    }
}


app.get('/', (req, res) => {
    res.render('index')     
})

app.get("/login", (req, res) => {
    res.render("login")
})

app.get("/profile",isLoggedIn, async (req, res) => {
    let person = await userModel.findOne({ email: req.user.email }).populate("post")
    res.render("profile",{person})
})

app.get("/like/:id",isLoggedIn, async (req, res) => {
    let post = await postModel.findById(req.params.id).populate("user");  
    const likeIndex = post.likes.indexOf(req.user.userid);
    if (likeIndex == -1) {
        post.likes.push(req.user.userid);
    }
    else {
        post.likes.splice(likeIndex, 1);
    }
    await post.save();
    res.redirect("/profile");
})
app.get("/edit/:id",isLoggedIn, async (req, res) => {
    let post = await postModel.findById(req.params.id).populate("user");  
    res.render("edit",{post})
})

app.post("/update/:id", async (req, res) => {
    let post = await postModel.findOneAndUpdate({ _id: req.params.id }, { content: req.body.content })
    res.redirect("/profile")
})

app.post("/post",isLoggedIn, async (req, res) => {
    let person = await userModel.findOne({ email: req.user.email })  
    let content = req.body.content;
    let post = await postModel.create({
        user: person._id,
        content:content
    })
    person.post.push(post._id);
    await person.save()
    res.redirect("/profile");
})

app.get("/logout", (req, res) => {
    res.cookie("token","")
    res.redirect("/login")
})


app.post('/register', async (req, res) => {
    let { email, password, username, name, age } = req.body
    
    let user = await userModel.findOne({ email })
    if (user) return res.send("User Already Registered")
    
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let user = await userModel.create({
                username,
                email,
                age,
                name,
                password: hash
            })
            // let token = jwt.sign({ email, userid: user._id }, secreatkey)
            // res.cookie("token", token, { httpOnly: true });
            res.redirect("/")
        })
    })    
})

app.post('/login', async (req, res) => {
    let { email, password} = req.body
    
    let user = await userModel.findOne({ email })
    if (!user) return res.send("Something Went Wrong")
    
    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            let token = jwt.sign({ email, userid: user._id }, secreatkey)
            res.cookie("token", token, { httpOnly: true });
            res.status(200).redirect("/profile") 
        }
        else res.redirect("/login")
    })
})




app.listen(port, () => console.log(`Example app listening on port ${port}!`))