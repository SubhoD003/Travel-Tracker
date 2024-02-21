import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

// Database connection 👇
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "World",
  password: "root@123 ",
  port: 5432,
});
db.connect()

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [];

async function getCurrentUser(){
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}
async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1; ",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();

    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: currentUser.color,
    });
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE country_name LIKE  ($1); ",
      [input]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    let checkData
    try{
       checkData = await  db.query(
        "SELECT * FROM visited_countries WHERE country_Code = ($1) AND  user_id = ($2);",
        [countryCode, currentUser.id]
      )
    }catch(err){
      console.log(err)
    }
    if(checkData.rowCount == 0 ){
      try {
        await db.query(
          "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
          [countryCode, currentUserId]
        );
        res.redirect("/");}
         catch (e) {
           console.error(e.stack);
           return res.sendStatus(500);
         }
  }else{
        res.render("index.ejs", {
          countries: countries,
          total: countries.length,
          users: users,
          color: currentUser.color,
          error : "Country already marked !"
        });
  }
  } catch (err) {
          res.render("index.ejs",{
        countries: countries,
        total: countries.length,
        users: users,
        color: currentUser.color,
        error : "Enter valid country name (e.g India)"
      })
  }
});

app.post("/user", async (req, res) => {
  if(req.body.add === "new"){
    res.render("new.ejs");
  }else{
    currentUserId = req.body.user;
    res.redirect("/")
  }
});


app.post("/new", async (req, res) => {

  const name = req.body.name;
  const color = req.body.color;

  const result = await db.query(
    "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
    [name, color]
  );

  const id = result.rows[0].id;
  currentUserId = id;
  res.redirect("/");
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});