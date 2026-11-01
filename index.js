import express from 'express'
import path from "path";
import multer from 'multer'
import dotenv from 'dotenv'
import { fileURLToPath } from "url";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AgentExecutor, createToolCallingAgent } from "@langchain/classic/agents";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod"
dotenv.config()

/*
touch uploads/.gitkeep
git add uploads/.gitkeep
git commit -m "Keep uploads folder"
*/

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);


const port = process.env.PORT

const app = express()
app.use(express.json())

app.use(express.static(path.join(__dirname, "public")));

const model = new ChatGoogleGenerativeAI({
  model: "models/gemini-2.5-flash", // Free-tier model - use pro
  maxOutputTokens: 2048,
  temperature: 0.7,
  apiKey: process.env.GOOGLE_API_KEY,
});

const getMenuTool = new DynamicStructuredTool({
  name: "getMenu",
  description: "Returns the final answer for today's menu for the given category (breakfast, lunch, or dinner). Use this tool to answer the user's menu question directly.",
  schema: z.object({
    category: z.string().describe("Type of food. Example: breakfast, lunch, dinner"),
  }),
  func: async ({ category }) => {
    const menus = {
      breakfast: "Aloo Paratha, Poha, Masala Chai",
      lunch: "Paneer Butter Masala, Dal Fry, Jeera Rice, Roti",
      dinner: "Veg Biryani, Raita, Salad, Gulab Jamun",
    };
    return menus[category.toLowerCase()] || "No menu found for that category.";
  },
});

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful assistant that uses tools when needed."],
  ["human", "{input}"],
  ["ai", "{agent_scratchpad}"]
]);

const agent = await createToolCallingAgent({
    llm: model,
    tools: [getMenuTool],
    prompt
})

const executor = await AgentExecutor.fromAgentAndTools({
    agent,
    tools: [getMenuTool],
    verbose: true,
    maxIterations:5,
    returnIntermediateSteps: true
});

app.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname,'public','index.html'))
})



app.post('/api/chat',async (req,res)=>{

    const userInput = req.body.input;

    console.log(userInput)
  //  res.send(`<h1>{userInput}</h1>`)
 // try{
     const response = await executor.invoke({input:userInput})

     const data = response.returnIntermediateSteps[0].observation

    // console.log(">>>>>>>>>>>>>>>",data)

    if(response.output && response.output != 'Agent stopped due to max iterations.'){
    return res.json({output: response.output});

     }
     else if(data != null){
    return res.json({output: data});
       }
      res.status(500).json({output: "Agent couldn't find a valid answer."})
 // }
//   catch(err){

//     console.log("Error During Agent Execution ", err)

//     res.status(500).json({output:"Sorry Something wnt Wrong , please try again  later"})

//   }
})

app.listen(port,()=>{
    console.log(`server started at ${port}`)
})