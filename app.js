const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
 const path = require('path');
const userModel = require('./models/user');
const postModel = require('./models/post');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto')
const upload = require('./config/multerconfig');


app.set("view engine", "ejs");
 app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());



app.get('/', function (req, res) {
    res.render('index');
})

app.get('/profile/upload', function (req, res) {
    res.render('profileupload');
});

app.post('/upload', isLoggedIn, upload.single("image"), async function (req, res) {
    let user = await userModel.findOne({ email: req.user.email});
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect("/profile");
})



app.get('/login', function (req, res) {
    res.render('login');
})

app.get("/profile", isLoggedIn, async function(req, res){
  let user =  await userModel.findOne({email: req.user.email}).populate("posts")
    res.render("profile", {user});
});

app.get("/like/:id", isLoggedIn, async function(req, res){
    let post =  await postModel.findOne({_id: req.params.id}).populate("user");
    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid);
    }
    else{
      post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }
    await post.save();
      res.redirect("/profile");
  });

  app.get("/edit/:id", isLoggedIn, async function(req, res){
    let post =  await postModel.findOne({_id: req.params.id}).populate("user");
    res.render('edit', {post});
  });
  
  
  app.post("/update/:id", isLoggedIn, async function(req, res){
    let post =  await postModel.findOneAndUpdate({_id: req.params.id}, {content: req.body.content});

    res.redirect("/profile");
  });
  

  

app.post("/post", isLoggedIn, async function(req, res){
    let user =  await userModel.findOne({email: req.user.email});
    let {content} = req.body;

     let post = await postModel.create({
        user: user._id,
        content
     });

     user.posts.push(post._id);
     await user.save();
     res.redirect('/profile');
  });

app.post('/register', async function (req, res) {
    let { email, username, age, password } = req.body;
    let user = await userModel.findOne({ email });

    if (user) return res.status(500).send("user alrady registered");

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let user = await userModel.create({
                username,
                email,
                age,
                password: hash
            });

            let token = jwt.sign({ email: email, userid: user._id }, "shhh");
            res.cookie("token", token);
            res.send("registered");


        })
    })

})

app.post("/login", async function (req, res) {
    let { email, password } = req.body;
    let user = await userModel.findOne({ email });

    if (!user) return res.status(500).send("something went wrong");

    bcrypt.compare(password, user.password, function (err, result) {
        if (result) {
            let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
            res.cookie("token", token);
            res.status(200).redirect("/profile");
        }
        else res.redirect("/login");
    });
});

app.get('/logout', function (req, res) {
    res.cookie("token", "")
    res.redirect("/login");
})

// this is a middleware
function isLoggedIn(req, res, next){
//  this is how we can check the token in backend

// this is our protective route 
//    iska use hai => jab bhi isLoggedIn kisi bhi route pe lgaege to ye sbse pahle middleware pe aega agr vo valid token hoga to vo token verify ho jaega us secret ke hisab s or hame vo data mil jaega jo hamne phli bar data set kiya  tha!!!
if (req.cookies.token === "") res.redirect("/login"); 
else{
   let data = jwt.verify(req.cookies.token, "shhhh");
   req.user = data;
   next();
}

}

app.listen(4000);