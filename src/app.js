require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const path = require("path");
const ejs = require("ejs");
const sessions = require("express-session");
// const collection = require("./mongodb");
const PosT = require("./postdb");
const Profile = require("./profiledb");
// const conn = require("./connection")
let imagename
const multer = require("multer");
const { send, title } = require("process");
const { profile } = require("console");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/thumbnails");
  },
  filename: (req, file, cb) => {
    // console.log(file);

    cb(null, file.originalname);
    imagename = file.originalname;
  },
});
const upload = multer({ storage: storage });
let user;
app.use(express.json());
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(
  sessions({
    secret: "secret key",
    saveUninitialized: true,
    resave: false,
  })
);

const visitSchema = new mongoose.Schema({
  visits: Number
});

const visits = mongoose.model("visits", visitSchema);

// Feedback schema for blog posts
const feedbackSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  feedback: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const Feedback = mongoose.model("Feedback", feedbackSchema);

app.get("/home", async (req, res) => {
  if (req.session.useremail) {
    try {
      // Filter out posts from author "manoj"
      const posts = await PosT.find({ author: { $ne: "manoj" } }).exec();
      const sortedPosts = await PosT.find({ author: { $ne: "manoj" } }).sort({ like: "desc" }).exec();

      res.render("home", {
        user: req.session.username,
        posts: posts,
        date: Date.now(),
        sposts: sortedPosts,
      });
    } catch (err) {
      console.log(err);
      res.render("error", { error: "Error fetching posts" });
    }
  } else {
    res.redirect("/");
  }
});
app.get("/", (req, res) => {
  if (req.session.useremail) {
    res.redirect("/home");
  } else {
    res.render("landing");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/logout", (req, res) => {
  req.session.destroy(); 
  imagename=null
  res.redirect("/");
});
app.get("/signup",(req,res)=>{
  res.render("login");
});
app.post("/signup", async (req, res) => {

  const userExists = await Profile.exists({ username:req.body.name });
  // const loginData = {
  //   name: req.body.name,
  //   email: req.body.email,
  //   password: req.body.password,
  //   type: "user",
  // };
  if(!userExists){
  const profileData = {
    username: req.body.name,
    email: req.body.email,
    password: req.body.password,
    type: "user",
    fullname:req.body.name,
    dp: "",
    bio: "",
    weblink: "",
    facebook: "",
    whatsapp: "",
    twitter: "",
    instagram: "",
    phoneno: "",
  };

  // await collection.insertMany(loginData);
  await Profile.insertMany(profileData)
  req.session.useremail = req.body.email;
  req.session.username = req.body.name;
  res.redirect("home");
}else{
  res.send("<script>alert('user already exits');window.location.href = '/'</script>");

}
});

app.post("/login", async (req, res) => {
  try {
    const check = await Profile.findOne({ email: req.body.email });
    if (check.password === req.body.password) {
      if (check.type === "admin") {
        req.session.useremail = check.email;
        req.session.username = check.username;
        req.session.type = "admin"
        res.redirect("admin")
      } else {
        visits.findOneAndUpdate(
          { _id: "640cb99cd1ab2ecb248598b4" },
          { $inc: { visits: 1 } },
          (err) => {});
        req.session.useremail = check.email;
        req.session.username = check.username;
        req.session.type = "user"
        console.log(req.session.user);
        res.redirect("home");
      }
    } else {
      res.send("<script>alert('Wrong Password');window.location.href = '/'</script>");
    }
  } catch {
    res.send("<script>alert('Wrong details');window.location.href = '/'</script>");
  }
});

app.get("/compose", (req, res) => {
  if(req.session.username){
  res.render("compose", { user: req.session.username });
  }
});
app.post("/compose", upload.single("image"), async (req, res) => {
  const postData = {
    author: req.session.username,
    title: req.body.postTitle,
    content: req.body.postBody,
    thumbnail: imagename,
    date: Date.now(),
    like: 0,
  };
  await PosT.insertMany(postData);
  res.redirect("/home");
});
app.get("/posts/:custom", async (req, res) => {
  if (req.session.username) {
    try {
      const posts = await PosT.find({ author: { $ne: "manoj" } });
      const specificPost = await PosT.findById(req.params.custom);

      if (!specificPost) {
        return res.render("notfound");
      }
      
      // Fetch feedback for this post
      const feedbackList = await Feedback.find({ postId: req.params.custom })
        .sort({ date: -1 })
        .exec();
      
      res.render("posts", {
        user: req.session.username,
        posts: posts,
        date: Date.now(),
        id: req.params.custom,
        feedback: feedbackList
      });
    } catch (error) {
      console.error('Error fetching post:', error);
      res.redirect("/notfound");
    }
  } else {
    res.redirect("/");
  }
});
app.post("/posts/:custom", (req, res) => {
  const id = req.params.custom;
  var userid = req.session.username;

  PosT.findOne({ _id: { $eq: id } }, (err, result) => {
    if (result.likedby.includes(userid)) {
      PosT.findOneAndUpdate(
        { _id: id },
        { $pull: { likedby: userid } },
        { new: true }
      ).exec((err, result) => {
        if (err) {
          console.log(err);
        } else {
          console.log("user disliked");

          PosT.findOneAndUpdate({ _id: id }, { $inc: { like: -1 } }, (err) => {
            if (err) {
              console.log(err);
            } else {
              console.log("updated");
            }
          });
        }
      });
    } else {
      PosT.findOneAndUpdate(
        { _id: id },
        { $push: { likedby: userid } },
        { new: true }
      ).exec((err, result) => {
        if (err) {
          console.log(err);
        } else {
          console.log("user liked");
          PosT.findOneAndUpdate({ _id: id }, { $inc: { like: 1 } }, (err) => {
            if (err) {
              console.log(err);
            } else {
              console.log("updated");
            }
          }); //
        }
      });
    }
    if (err) {
      console.log(err);
    }
  });
});

app.get("/update/:custom",(req,res)=>{
   if(req.session.username){
  PosT.findById(req.params.custom,(err,result)=>{
    console.log(result);
     if(req.session.username===result.author||req.session.username==="admin"){
    res.render("edit-post",{user:req.session.username,post:result})
     }else{
      res.render("notfound")
     }
  })
}
})
app.post("/update/:custom", upload.single("image"), async (req, res) => {
  PosT.findByIdAndUpdate(
    req.params.custom,
    {
      title:req.body.postTitle,
      content: req.body.postBody,
      thumbnail: imagename,
    },
    (err) => {
      if (err) {
        console.log(err);
      }
    }
  );
  res.redirect("/posts/" + req.params.custom);
});

app.get("/delete/:custom", (req, res) => {
 if(req.session.username){
  PosT.findById(req.params.custom,(err,results)=>{
     if (
       req.session.username === results.author ||
       req.session.type === "admin"
     ){
       PosT.findByIdAndRemove(req.params.custom, (err) => {
         console.log("deleted");
         if (req.session.username === "admin") {
           res.redirect("/admin");
         } else {
           res.redirect("/home");
         }
       });
      }else{
        res.render("notfound")
      }
  })
  
}else{
  res.redirect("/")
}
});


app.get("/profile/:customRoute", (req, res) => {

  if(req.session.username){
  const customRoute = req.params.customRoute;
// Profile.findOne({username:req.session.username},(err,result)=>{
//   if(err){
//     console.log(err);
//   }else{
//   console.log(result.dp); 
//   }
// })

  PosT.find({ author: customRoute}, (err, result)=> {
    if (err){
        console.log(err);
        
    }
    else{
        req.session.userposts=result;
        Profile.findOne({username:customRoute},(err,results)=>{
          res.render("profile", {
          username: req.session.username,
          posts: req.session.userposts,
          userdata:results,
          date: Date.now(),
        });
        // console.log(results);
        })
        
        
    }})
    // console.log(req.session.userposts);
  }else{
    res.redirect("/")
  }
});


app.get("/editprofile/:custom",(req,res)=>{
  if(req.session.username){
     Profile.findOne({username:req.params.custom},(err,results)=>{
     if (req.session.username === results.username){
  Profile.findOne({username:req.session.username},(err,result)=>{
    res.render("edit-profile",{username:req.session.username,email:req.session.useremail,userdata:result})
  })}else{
    res.render("notfound")
  }})
}else{
  res.redirect("/")
}
})


app.post("/editprofile/:custom",upload.single("image"), async (req, res) => {
  const custom=req.params.custom 

 
// console.log(imagename);
  Profile.findOneAndUpdate(
    { username: req.session.username },
    {
      fullname: req.body.fullname,
      email: req.session.useremail,
      dp: imagename,
      bio: req.body.bio,
      weblink: req.body.weblink,
      facebook: req.body.fb,
      whatsapp: req.body.wa,
      twitter: req.body.tw,
      instagram: req.body.insta,
      phoneno: req.body.phno,
    },
    (err) => {
      if (err) {
        console.log(err);
      } else {
        console.log("updated");
      }
    }
  );


  res.redirect("/profile/"+custom);
});

app.get("/admin",(req,res)=>{
  if(req.session.type==="admin"){
  // collection.find((err,logins)=>{
    Profile.find((err,profiles)=>{
      PosT.find((err,posts)=>{
        visits.find((err,visits)=>{
         res.render("admin",{profiles:profiles,posts:posts,visits:visits,username:req.session.username});
        })
      })
    })
  }else{
    res.redirect("/")
  }
  // })
 
})

app.get("/removeuser/:custom", (req, res) => {
  if(req.session.type==="admin"){
  Profile.findByIdAndRemove(req.params.custom, (err) => {
    PosT.deleteMany({author:{$eq:req.query.user}},(err)=>{
      if(err){
        console.log(err);
      }else{
        res.redirect("/admin")
      }
    })
  });
}else{
  res.render("notfound")
}
});




app.post("/search", async (req, res) => {
  try {
    let payload = req.body.payload.trim();
    
    // If payload is empty, return empty results
    if (!payload) {
      return res.send({ payload: [] });
    }

    // Create search regex for case-insensitive partial matches
    const searchRegex = new RegExp(payload, 'i');

    // Search in title first, then in content, excluding posts by "manoj"
    let search = await PosT.find({
      $and: [
        { author: { $ne: "manoj" } },
        { $or: [
          { title: searchRegex },
          { content: searchRegex }
        ]}
      ]
    })
    .select('title author content thumbnail')
    .limit(10)
    .sort({ date: -1 })
    .exec();

    // Process results to include preview
    search = search.map(post => ({
      _id: post._id,
      title: post.title,
      author: post.author,
      thumbnail: post.thumbnail,
      preview: post.content.substring(0, 100) + '...'
    }));

    res.send({ payload: search });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).send({ error: 'Search failed', payload: [] });
  }
});

app.get("/:custom", (req, res) => {
  res.render("notfound")
});
app.get("/:custom/:custom2",(req,res)=>{
  res.render("notfound")
})

// Update the summarize route to use Gemini REST API
app.post("/summarize/:postId", async (req, res) => {
  try {
    const post = await PosT.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    console.log("Post found:", { title: post.title, contentLength: post.content.length });

    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Prepare the request body
    const requestBody = {
      contents: [{
        parts: [{
          text: `Please provide a concise summary of this blog post.\nTitle: ${post.title}\n\nContent: ${post.content}`
        }]
      }]
    };

    try {
      console.log("Sending request to Gemini API...");
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      console.log("Received response from Gemini API:", data);

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to generate summary');
      }

      const summary = data.candidates[0].content.parts[0].text;
      
      if (!summary) {
        throw new Error("Empty summary received from Gemini API");
      }
      
      console.log("Summary generated successfully");
      res.json({ summary });
    } catch (apiError) {
      console.error("Gemini API Error Details:", apiError);
      res.status(500).json({ error: `Gemini API Error: ${apiError.message}` });
    }
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "An error occurred while processing your request" });
  }
});

app.post("/generate-content", async (req, res) => {
  try {
    const { title } = req.body;
    
    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "Title is required" });
    }

    console.log("Generating content for title:", title);

    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Prepare the request body
    const requestBody = {
      contents: [{
        parts: [{
          text: `Write a detailed, informative, and engaging blog post with the title: "${title}". 
          The blog post should be well-structured with paragraphs, include relevant information, and be between 500-800 words.
          Make it sound professional and knowledgeable on the topic.`
        }]
      }]
    };

    try {
      console.log("Sending request to Gemini API for content generation...");
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to generate content');
      }

      const generatedContent = data.candidates[0].content.parts[0].text;
      
      if (!generatedContent) {
        throw new Error("Empty content received from Gemini API");
      }
      
      console.log("Content generated successfully");
      res.json({ content: generatedContent });
    } catch (apiError) {
      console.error("Gemini API Error Details:", apiError);
      res.status(500).json({ error: `Gemini API Error: ${apiError.message}` });
    }
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "An error occurred while processing your request" });
  }
});

// Add feedback route
app.post("/feedback/:postId", async (req, res) => {
  try {
    if (!req.session.username) {
      return res.status(401).json({ error: "You must be logged in to submit feedback" });
    }

    const { feedback } = req.body;
    
    if (!feedback || feedback.trim() === "") {
      return res.status(400).json({ error: "Feedback cannot be empty" });
    }

    // Check if post exists
    const post = await PosT.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Create new feedback
    const newFeedback = new Feedback({
      postId: req.params.postId,
      username: req.session.username,
      feedback: feedback.trim()
    });

    await newFeedback.save();
    
    // Return the newly created feedback with formatted date
    const savedFeedback = {
      _id: newFeedback._id,
      username: newFeedback.username,
      feedback: newFeedback.feedback,
      date: newFeedback.date,
      formattedDate: formatDate(newFeedback.date)
    };

    res.status(201).json({ success: true, feedback: savedFeedback });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ error: "An error occurred while submitting feedback" });
  }
});

// Helper function to format date for feedback
function formatDate(date) {
  const now = new Date();
  const feedbackDate = new Date(date);
  const diffTime = Math.abs(now - feedbackDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      if (diffMinutes === 0) {
        return "Just now";
      } else if (diffMinutes === 1) {
        return "1 minute ago";
      } else {
        return `${diffMinutes} minutes ago`;
      }
    } else if (diffHours === 1) {
      return "1 hour ago";
    } else {
      return `${diffHours} hours ago`;
    }
  } else if (diffDays === 1) {
    return "1 day ago";
  } else {
    return `${diffDays} days ago`;
  }
}

app.listen(process.env.PORT || 3000, () => {
  console.log("server started at port 3000");
});
