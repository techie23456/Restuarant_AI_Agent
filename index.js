import express from 'express'
import multer from 'multer'
import dotenv from 'dotenv'
dotenv.config()

const port = process.env.PORT

const app = express()
app.use(express.json())

const upload = multer({dest:"uploads/"})

app.get('/uploads',upload.single("pdf"), async(req,res)=>{
    console.log(req.file)
    res.send('File Uploaded')
})

app.get('/', (req,res)=>{
    res.send('<h1>hello</h1>')
})

app.listen(port,()=>{
    console.log(`server started at ${port}`)
})