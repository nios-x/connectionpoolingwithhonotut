import { Hono } from 'hono'
import { getPrisma } from './db'
import { jwt } from 'hono/jwt'
import { decode, sign, verify } from 'hono/jwt'
import { use } from 'hono/jsx'
const app = new Hono<{
  Bindings: {
    DATABASE_URL: string
    JWT_SECRET: string
  }
}>()
app.get('/posts', async(c) => {
  const prisma = getPrisma(c.env.DATABASE_URL)
  const data = await prisma.posts.findMany({})
  return c.json(data)
})
app.use("v1/*", async(c, next)=>{
  const header = c.req.header("authorization")||"";
  const response = await verify(header, "secret")
  if(response?.id)
  await next()
  return c.json({error:"unauthorised"})
})
app.post("/signin", async(c)=>{
   const prisma = getPrisma(c.env.DATABASE_URL)
  const body = await c.req.json()
  if(!body.email || !body.password){
    return c.json({
      "status":"error"
    })
  }
  const user = await prisma.user.findUnique({
    where:{
      email:body.email,
      password:body.password
    }
  })
  if(user){
    const token = await sign({id: user.id}, "secret")
    return c.json({token})
  }return c.json({status:"error"})
})
app.post("/signup", async(c)=>{

  const prisma = getPrisma(c.env.DATABASE_URL)
  const body = await c.req.json()
  if(!body.email || !body.password){
    return c.json({
      "status":"error"
    })
  }
    const existingUser = await prisma.user.findUnique({ where: { email: body.email } })
  if (existingUser) {
    return c.json({ status: "error", message: "Email already registered" }, 409)
  }
  const user = await prisma.user.create({
    data:{
      email:body.email,
      password:body.password
    }
  })
  const t = await sign({id:user.id}, "secret")

  return c.json({token:t})
})
app.post("/v1/posts", async(c)=>{
  const prisma = getPrisma(c.env.DATABASE_URL)
  const body = await c.req.json()
  if(!body.title|| !body.content){
    return c.json({
      "status":"error "
    })
  }
  const header = c.req.header("authorization");
  if(!header)return c.json({"response":"noheaders"})
  const author = decode(header).payload
  
    if (!author || typeof author.id !== "number") {
    return c.json({ status: "error", message: "Unauthorized or malformed token" }, 401);
  }
   const post = await prisma.posts.create({
    data:{
      title:body.title,
      content:body.content,
      authorid:author.id
    }
  })

  return c.json(post)
})
export default app
