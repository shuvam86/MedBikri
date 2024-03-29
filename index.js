import bodyParser from 'body-parser';
import express from 'express';
import fetch  from 'node-fetch';
import mongoose  from 'mongoose';
import cron from 'node-cron';
import path from 'path'
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
import * as dotenv from 'dotenv';
dotenv.config();
const app=express();
const __dirname = path.dirname(__filename);

//Middlewares
app.use('/dist', express.static(path.join(__dirname, "dist")));


//geting the api keys from env
const API_CALLS=[process.env.API_KEY1,process.env.API_KEY2];


//Schema of the data object
var videoSchema = new mongoose.Schema({
    videoTitle   : String,
    videoChannelTitle:String,
    videoDesc: String,
    videoPubDate:String,
    videoThumbNail:String
});


//Data description
// index > snippet > description , publishinDate, title , thumbnails.high.url , channelTitle

var  VideoData= mongoose.model("medbikri", videoSchema);

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());
const noDesciption="Description Not available..."
let search_query="";
//mongoose connection
mongoose.connect("mongodb+srv://medbikri:Password12346789@cluster0.12qrfbl.mongodb.net/medbikri",{useNewUrlParser:true, useUnifiedTopology:true});
mongoose.connection.on("connected",()=>{
    console.log("Connected DB");})


let objVideoData= new VideoData({
    videoTitle:"",
    videoChannelTitle:"",
    videoDesc:"",
    videoPubDate:"",
    videoThumbNail:""
})




//getting data and using only the valid api calls
//if one fails it "trys for another one"
const getData=async function ()
{
    let valid=false;
   for(let i=0;i<API_CALLS.length;i++){
    let API_KEY=API_CALLS[i];
    let API_URL="";
    try
    {
        if(search_query.length==0){
          API_URL=`https://youtube.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&order=date&key=${API_KEY}`;
        }
        else {
         API_URL=`https://youtube.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&order=date&q=${search_query}&key=${API_KEY}`;

        }
        const res = await fetch(API_URL);
        const data=await res.json();
        let itemsData=data.items;
        let saveData=itemsData.map(item=>{
            let objVideoData= new VideoData({
                videoTitle:item.snippet.title,
                videoChannelTitle:item.snippet.channelTitle,
                videoDesc:item.snippet.description.length==0?noDesciption: item.snippet.description,
                videoPubDate:item.snippet.publishTime,
                videoThumbNail:item.snippet.thumbnails.high.url,
            })
            objVideoData.save();
            valid=true;
        })
    }catch(e){
        console.log("Failed - ", e);
    }
    if(valid) break;
   }
}



//cronjob sceduling the job for every 10 minute 

//Implementation of Node-Cron ***** , secs,min,hr,day,week,month
cron.schedule('0,10 * * * *', () => {
    // Do your work here
    getData();
  });
app.get('/api/all', (req, res) => {
    const page = req.query.page || 1;
    const pageSize = req.query.pageSize || 10;
    // Calculate the number of documents to skip
    const skip = (page - 1) * pageSize;
  
    // Set the limit on the query
    const query = VideoData.find().sort({videoPubDate:-1}).skip(skip).limit(pageSize);
  
    // Execute the query and return the results to the client
    query.exec((err, items) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.send(items);
      }
    });
  });

app.get('/',(req,res)=>{

    res.sendFile(path.join(__dirname,'/static/index.html'));
})



//searching from the input user query
app.get('/api/search',(req,res)=>{
search_query=req.query.search;
if(search_query.length===0)
{
    res.redirect('/api/all')
}
else{
VideoData.find({
    'videoTitle': { $regex: search_query, $options: 'i' }},(err,data)=>{
    if(err)
    {
        res.send(err)
    }
    else{
        res.send(data);
    }
})
}
})



//Running port at 3000

const port = process.env.PORT || 3000;
app.listen(port,()=>{
    console.log("Server is running");
})

